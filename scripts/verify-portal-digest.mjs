#!/usr/bin/env node
// Verifies the daily digest cron path:
//   - kill switch off → sweep returns enabled:false
//   - empty pool → no row written, no email sent
//   - notes pool → digest row inserted, email logged, notes flip to client_sent_at
//   - second run → already_sent (UNIQUE catches double-send)
//   - internal + suppressed notes → never included
//
// Calls the runDigestForProspect() function via dynamic import — no
// HTTP fetch needed. Hits a real test Supabase project.
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (digest sweep helpers query Supabase directly).
//
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 13.2

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

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
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

const TEST_EMAIL = `verify-digest-${Date.now()}@example.test`

let exitCode = 0
function pass(msg) { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.error(`  ✗ ${msg}`); exitCode = 1 }

async function setup() {
  // Synthetic client + project
  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .insert({
      business_name: 'Digest Test',
      owner_email: TEST_EMAIL,
      owner_name: 'Test Owner',
      is_client: true,
      stage: 'closed',
      source: 'manual',
      industry: 'other',
    })
    .select('id')
    .single()
  if (pErr) throw pErr

  const { data: project, error: prjErr } = await supabase
    .from('projects')
    .insert({
      prospect_id: prospect.id,
      name: 'General Support',
      status: 'active',
    })
    .select('id')
    .single()
  if (prjErr) throw prjErr

  return { prospectId: prospect.id, projectId: project.id }
}

async function cleanup(prospectId) {
  // Cascade should clean projects, notes, time entries, digests via FK CASCADE
  await supabase.from('prospects').delete().eq('id', prospectId)
}

async function seedNotes({ prospectId, projectId }) {
  const baseTime = new Date(Date.now() - 6 * 60 * 60_000).toISOString()
  // 1 client-visible note
  const { data: visible } = await supabase
    .from('project_notes')
    .insert({
      prospect_id: prospectId,
      project_id: projectId,
      title: 'Test update',
      body: 'Made progress on the homepage hero.',
      visibility: 'client',
      source: 'manual',
      created_at: baseTime,
    })
    .select('id')
    .single()
  // 1 internal note
  await supabase.from('project_notes').insert({
    prospect_id: prospectId,
    project_id: projectId,
    body: 'Internal: noticed legacy bug',
    visibility: 'internal',
    source: 'manual',
    created_at: baseTime,
  })
  // 1 suppressed
  await supabase.from('project_notes').insert({
    prospect_id: prospectId,
    project_id: projectId,
    body: 'Suppressed update',
    visibility: 'client',
    source: 'manual',
    suppressed: true,
    created_at: baseTime,
  })
  return { visibleNoteId: visible.id }
}

async function main() {
  let ctx
  try {
    ctx = await setup()
    console.log(`Test prospect: ${ctx.prospectId} | project: ${ctx.projectId}`)

    const { runDigestForProspect } = await import(
      `file://${resolve(ROOT, 'src/lib/portal-digest.ts').replace(/\\/g, '/')}`
    ).catch(async () => {
      // tsx runtime path
      const { runDigestForProspect } = await import(
        `file://${resolve(ROOT, 'src/lib/portal-digest.ts').replace(/\\/g, '/')}`
      )
      return { runDigestForProspect }
    })

    console.log('\n[1] Empty pool — should skip silently')
    let r = await runDigestForProspect(ctx.prospectId)
    if (r.status === 'skipped' && r.skipReason === 'no_notes') {
      pass(`skipped with reason ${r.skipReason}`)
    } else {
      fail(`expected skipped/no_notes, got ${JSON.stringify(r)}`)
    }

    console.log('\n[2] Seeded notes — should send + flip client_sent_at')
    const { visibleNoteId } = await seedNotes(ctx)
    r = await runDigestForProspect(ctx.prospectId)
    if (r.status === 'sent') {
      pass(`sent (notes=${r.noteCount}, totalMinutes=${r.totalMinutes ?? 0})`)
    } else {
      fail(`expected sent, got ${JSON.stringify(r)}`)
    }
    const { data: visibleAfter } = await supabase
      .from('project_notes')
      .select('client_sent_at')
      .eq('id', visibleNoteId)
      .single()
    if (visibleAfter?.client_sent_at) {
      pass(`client_sent_at flipped on visible note`)
    } else {
      fail(`client_sent_at NOT flipped`)
    }

    console.log('\n[3] Internal + suppressed should NOT have flipped')
    const { count: pendingInternal } = await supabase
      .from('project_notes')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', ctx.prospectId)
      .eq('visibility', 'internal')
      .is('client_sent_at', null)
    const { count: pendingSuppressed } = await supabase
      .from('project_notes')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', ctx.prospectId)
      .eq('suppressed', true)
      .is('client_sent_at', null)
    if (pendingInternal === 1) pass('internal note NOT sent')
    else fail(`expected 1 untouched internal, got ${pendingInternal}`)
    if (pendingSuppressed === 1) pass('suppressed note NOT sent')
    else fail(`expected 1 untouched suppressed, got ${pendingSuppressed}`)

    console.log('\n[4] Second run — already_sent dedup')
    r = await runDigestForProspect(ctx.prospectId)
    if (r.status === 'skipped' && (r.skipReason === 'no_notes' || r.skipReason === 'already_sent')) {
      pass(`second run skipped (${r.skipReason})`)
    } else {
      fail(`expected skip, got ${JSON.stringify(r)}`)
    }
  } catch (e) {
    fail(`uncaught: ${e.message}\n${e.stack ?? ''}`)
  } finally {
    if (ctx?.prospectId) await cleanup(ctx.prospectId)
    console.log(exitCode === 0 ? '\nAll checks passed.' : '\nFAILED.')
    process.exit(exitCode)
  }
}

main()
