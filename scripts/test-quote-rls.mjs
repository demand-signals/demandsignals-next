#!/usr/bin/env node
// ── Quote Estimator RLS Test Suite ──────────────────────────────────────
// Verifies the anon role CANNOT access quote_* or invoice_* tables directly.
// Every forbidden operation must fail. Runs against a live Supabase project.
//
// Usage:
//   node scripts/test-quote-rls.mjs
//
// Requires in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY  (used only to seed + teardown test data)
//
// Exit code: 0 if all policies behave correctly, 1 otherwise.

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Load .env.local
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const [, k, v] = m
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '')
    }
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const anon = createClient(URL, ANON)
const admin = createClient(URL, SERVICE)

const results = []
let testSessionId = null

function record(name, passed, detail) {
  results.push({ name, passed, detail })
  const tag = passed ? 'PASS' : 'FAIL'
  console.log(`[${tag}] ${name}${detail ? `  — ${detail}` : ''}`)
}

async function expectFailure(name, promise, { allowEmptyArray = false } = {}) {
  try {
    const { data, error } = await promise
    // Under RLS, anon SELECTs that return no rows are "success with empty array" —
    // which is effectively the same as denied for our threat model. We want either
    // an error OR a zero-length array.
    if (error) {
      record(name, true, `blocked: ${error.code || error.message}`)
      return
    }
    if (Array.isArray(data)) {
      if (data.length === 0) {
        if (allowEmptyArray) {
          record(name, true, 'returned empty array (RLS filter)')
        } else {
          record(name, true, 'returned 0 rows (RLS filter)')
        }
        return
      }
      record(name, false, `LEAK: got ${data.length} row(s)`)
      return
    }
    if (data === null) {
      record(name, true, 'returned null')
      return
    }
    record(name, false, `LEAK: got data ${JSON.stringify(data).slice(0, 120)}`)
  } catch (e) {
    record(name, true, `threw: ${e.message}`)
  }
}

async function setup() {
  // Seed one test session using service role so we have a row to attempt access against.
  const { data, error } = await admin
    .from('quote_sessions')
    .insert({
      session_token: 'rls-test-' + Date.now(),
      share_token: 'rls-share-' + Date.now(),
      business_name: 'RLS Test Corp',
      status: 'active',
    })
    .select('id')
    .single()
  if (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
  testSessionId = data.id
  console.log(`\nSeeded test session: ${testSessionId}\n`)
}

async function teardown() {
  if (testSessionId) {
    await admin.from('quote_sessions').delete().eq('id', testSessionId)
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════')
  console.log('Quote Estimator RLS Test Suite')
  console.log('═══════════════════════════════════════════════════\n')

  // ──────────────── quote_sessions ────────────────
  await expectFailure(
    'anon SELECT * from quote_sessions',
    anon.from('quote_sessions').select('*'),
  )
  await expectFailure(
    'anon SELECT phone_encrypted from quote_sessions',
    anon.from('quote_sessions').select('phone_encrypted, phone_last_four'),
  )
  await expectFailure(
    'anon SELECT by id from quote_sessions',
    anon.from('quote_sessions').select('*').eq('id', testSessionId),
  )
  await expectFailure(
    'anon INSERT into quote_sessions',
    anon.from('quote_sessions').insert({
      session_token: 'anon-forged-' + Date.now(),
      share_token: 'anon-forged-share-' + Date.now(),
    }),
  )
  await expectFailure(
    'anon UPDATE quote_sessions by id',
    anon.from('quote_sessions').update({ business_name: 'HACKED' }).eq('id', testSessionId),
  )
  await expectFailure(
    'anon DELETE quote_sessions',
    anon.from('quote_sessions').delete().eq('id', testSessionId),
  )

  // ──────────────── quote_events ────────────────
  await expectFailure(
    'anon SELECT * from quote_events',
    anon.from('quote_events').select('*'),
  )
  await expectFailure(
    'anon INSERT into quote_events',
    anon.from('quote_events').insert({
      session_id: testSessionId,
      event_type: 'forged_event',
      event_data: { attack: true },
    }),
  )

  // ──────────────── quote_messages ────────────────
  await expectFailure(
    'anon SELECT * from quote_messages',
    anon.from('quote_messages').select('*'),
  )
  await expectFailure(
    'anon INSERT into quote_messages',
    anon.from('quote_messages').insert({
      session_id: testSessionId,
      role: 'ai',
      content: 'forged AI commitment: $100 firm quote',
    }),
  )
  await expectFailure(
    'anon UPDATE quote_messages',
    anon.from('quote_messages').update({ content: 'tampered' }).eq('session_id', testSessionId),
  )

  // ──────────────── quote_bids ────────────────
  await expectFailure(
    'anon SELECT * from quote_bids',
    anon.from('quote_bids').select('*'),
  )
  await expectFailure(
    'anon INSERT into quote_bids',
    anon.from('quote_bids').insert({
      session_id: testSessionId,
      amount_cents: 100,
    }),
  )

  // ──────────────── invoices ────────────────
  await expectFailure(
    'anon SELECT * from invoices',
    anon.from('invoices').select('*'),
  )
  await expectFailure(
    'anon INSERT into invoices',
    anon.from('invoices').insert({
      invoice_number: 'FAKE-001',
      subtotal_cents: 0,
      total_due_cents: 0,
    }),
  )

  // ──────────────── invoice_line_items ────────────────
  await expectFailure(
    'anon SELECT * from invoice_line_items',
    anon.from('invoice_line_items').select('*'),
  )
  await expectFailure(
    'anon INSERT into invoice_line_items',
    anon.from('invoice_line_items').insert({
      invoice_id: '00000000-0000-0000-0000-000000000000',
      description: 'Forged line',
      unit_price_cents: 0,
    }),
  )

  // ──────────────── quote_config ────────────────
  await expectFailure(
    'anon SELECT * from quote_config',
    anon.from('quote_config').select('*'),
  )
  await expectFailure(
    'anon SELECT ai_enabled from quote_config (catalog fingerprinting risk)',
    anon.from('quote_config').select('*').eq('key', 'ai_enabled'),
  )
  await expectFailure(
    'anon UPDATE quote_config ai_enabled',
    anon.from('quote_config').update({ value: false }).eq('key', 'ai_enabled'),
  )

  // ──────────────── SECURITY DEFINER functions ────────────────
  await expectFailure(
    'anon EXECUTE recompute_session_state',
    anon.rpc('recompute_session_state', { p_session_id: testSessionId }),
  )
  await expectFailure(
    'anon EXECUTE expire_stale_sessions',
    anon.rpc('expire_stale_sessions'),
  )
  await expectFailure(
    'anon EXECUTE generate_invoice_number',
    anon.rpc('generate_invoice_number'),
  )

  // ──────────────── Service role sanity (must succeed) ────────────────
  const serviceCheck = await admin.from('quote_sessions').select('id').eq('id', testSessionId).single()
  record(
    'service role CAN read seeded session',
    !serviceCheck.error && serviceCheck.data?.id === testSessionId,
    serviceCheck.error?.message,
  )

  const configCheck = await admin.from('quote_config').select('key, value').eq('key', 'ai_enabled').single()
  record(
    'service role CAN read quote_config',
    !configCheck.error && configCheck.data?.key === 'ai_enabled',
    configCheck.error?.message,
  )
}

async function main() {
  try {
    await setup()
    await runTests()
  } finally {
    await teardown()
  }

  console.log('\n═══════════════════════════════════════════════════')
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`)
  console.log('═══════════════════════════════════════════════════\n')

  if (failed > 0) {
    console.log('FAILED TESTS:')
    for (const r of results.filter((x) => !x.passed)) {
      console.log(`  - ${r.name}: ${r.detail}`)
    }
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('Test runner crashed:', e)
  process.exit(1)
})
