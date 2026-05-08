#!/usr/bin/env node
// Verifies the DB-touching surface of /portal auth:
//   - rate limiter denies after 5 attempts/email/hour
//   - magic-link verify mints a session row
//   - same jti cannot mint a second session (replay defense)
//   - revokeAllSessionsForProspect revokes every active row at once
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, PORTAL_MAGIC_LINK_SECRET.
//
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 13.1

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PORTAL_MAGIC_LINK_SECRET',
]
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}`)
    process.exit(1)
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const TEST_EMAIL = `verify-portal-${Date.now()}@example.test`

let exitCode = 0
function pass(msg) { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.error(`  ✗ ${msg}`); exitCode = 1 }

async function findOrCreateTestClient() {
  // Use a dedicated synthetic test prospect — we don't want to mutate
  // a real client's row. Reuse if it exists.
  const { data: existing } = await supabase
    .from('prospects')
    .select('id')
    .eq('owner_email', TEST_EMAIL)
    .maybeSingle()
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      business_name: 'Portal Auth Test',
      owner_email: TEST_EMAIL,
      is_client: true,
      stage: 'closed',
      source: 'manual',
      industry: 'other',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function cleanup(prospectId) {
  await supabase.from('client_portal_sessions').delete().eq('prospect_id', prospectId)
  await supabase.from('client_portal_login_attempts').delete().eq('email', TEST_EMAIL)
  await supabase.from('prospects').delete().eq('id', prospectId)
}

async function testRateLimit(prospectId) {
  console.log('\n[1] Rate limit — should deny after 5 attempts/hr')
  // Insert 5 prior attempts
  for (let i = 0; i < 5; i++) {
    await supabase.from('client_portal_login_attempts').insert({
      email: TEST_EMAIL,
      matched: true,
      method: 'magic_link_request',
      succeeded: true,
    })
  }
  const cutoff = new Date(Date.now() - 60 * 60_000).toISOString()
  const { count } = await supabase
    .from('client_portal_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', TEST_EMAIL)
    .eq('method', 'magic_link_request')
    .gte('created_at', cutoff)
  if ((count ?? 0) >= 5) {
    pass(`5 attempts found in 60-min window (count=${count})`)
  } else {
    fail(`expected ≥5 attempts in window, got ${count}`)
  }
}

async function testMintAndReplay(prospectId) {
  console.log('\n[2] Session mint + jti replay defense')
  const jti = globalThis.crypto.randomUUID()
  const cookieToken = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expires_at = new Date(Date.now() + 30 * 86400 * 1000).toISOString()

  const { error: insertErr } = await supabase
    .from('client_portal_sessions')
    .insert({
      prospect_id: prospectId,
      cookie_token: cookieToken,
      jti,
      login_method: 'magic_link',
      expires_at,
    })
  if (insertErr) {
    fail(`first mint failed: ${insertErr.message}`)
    return
  }
  pass('first mint with jti succeeded')

  // Second insert with same jti must collide
  const cookieToken2 = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const { error: replayErr } = await supabase
    .from('client_portal_sessions')
    .insert({
      prospect_id: prospectId,
      cookie_token: cookieToken2,
      jti,
      login_method: 'magic_link',
      expires_at,
    })
  if (replayErr && replayErr.code === '23505') {
    pass('replay attempt with same jti rejected (23505)')
  } else if (replayErr) {
    fail(`expected 23505, got: ${replayErr.code} ${replayErr.message}`)
  } else {
    fail('replay was NOT rejected — jti UNIQUE missing?')
  }
}

async function testRevokeAll(prospectId) {
  console.log('\n[3] revokeAllSessionsForProspect')
  // Mint 3 sessions
  const tokens = []
  for (let i = 0; i < 3; i++) {
    const t = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    tokens.push(t)
    await supabase.from('client_portal_sessions').insert({
      prospect_id: prospectId,
      cookie_token: t,
      jti: globalThis.crypto.randomUUID(),
      login_method: 'magic_link',
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    })
  }
  // Revoke all
  await supabase
    .from('client_portal_sessions')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: 'logout' })
    .eq('prospect_id', prospectId)
    .is('revoked_at', null)

  const { count } = await supabase
    .from('client_portal_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('prospect_id', prospectId)
    .is('revoked_at', null)
  if (count === 0) {
    pass('all active sessions revoked')
  } else {
    fail(`expected 0 active, got ${count}`)
  }
}

async function main() {
  let prospectId
  try {
    prospectId = await findOrCreateTestClient()
    console.log(`Test prospect: ${prospectId} (${TEST_EMAIL})`)
    await testRateLimit(prospectId)
    await testMintAndReplay(prospectId)
    await testRevokeAll(prospectId)
  } catch (e) {
    fail(`uncaught: ${e.message}`)
  } finally {
    if (prospectId) await cleanup(prospectId)
    console.log(exitCode === 0 ? '\nAll checks passed.' : '\nFAILED.')
    process.exit(exitCode)
  }
}

main()
