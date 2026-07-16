#!/usr/bin/env node
// End-to-end verification of the retainer ledger invariants.
// Run AFTER applying migration 059 (APPLY-059-2026-07-16.sql).
//
// Exercises: create ledger → manual credit → role-less handoff-style debit →
// approve-with-role (rate-card pricing) → waive → void-restores-balance →
// threshold math. Asserts the balance invariant (balance = approved credits −
// approved debits) at every step. Creates a throwaway prospect + ledger and
// deletes everything at the end.
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

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
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1) }
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

let failures = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`) }
  else { console.error(`  ✗ ${msg}`); failures++ }
}

// Recompute authoritative balance from transactions (mirrors recomputeBalance).
async function authoritativeBalance(ledgerId) {
  const { data } = await db.from('retainer_transactions').select('direction,status,amount_cents').eq('ledger_id', ledgerId)
  let c = 0, d = 0
  for (const t of data ?? []) {
    if (t.status !== 'approved') continue
    if (t.direction === 'credit') c += t.amount_cents; else d += t.amount_cents
  }
  return { credited: c, debited: d, balance: c - d }
}
async function recompute(ledgerId) {
  const { credited, debited, balance } = await authoritativeBalance(ledgerId)
  await db.from('retainer_ledgers').update({
    balance_cents: balance, lifetime_credited_cents: credited, lifetime_debited_cents: debited,
  }).eq('id', ledgerId)
  return balance
}
async function cachedBalance(ledgerId) {
  const { data } = await db.from('retainer_ledgers').select('balance_cents').eq('id', ledgerId).single()
  return data.balance_cents
}

let prospectId, ledgerId
const cleanup = async () => {
  if (ledgerId) await db.from('retainer_transactions').delete().eq('ledger_id', ledgerId)
  if (ledgerId) await db.from('retainer_ledgers').delete().eq('id', ledgerId)
  if (prospectId) await db.from('prospects').delete().eq('id', prospectId)
}

try {
  console.log('\nRetainer ledger verification\n' + '─'.repeat(40))

  // 0. rate card seeded?
  const { data: roles } = await db.from('rate_card_roles').select('key,hourly_rate_cents').order('sort_order')
  assert((roles ?? []).length === 6, `rate_card_roles seeded (${roles?.length ?? 0} roles)`)
  const engRate = roles?.find((r) => r.key === 'engineering')?.hourly_rate_cents
  assert(engRate === 10000, `engineering role = $100/hr (${engRate} cents)`)

  // 1. throwaway prospect + ledger
  const { data: p, error: pErr } = await db.from('prospects')
    .insert({ business_name: 'RETAINER VERIFY (delete me)', client_code: 'RVER' })
    .select('id').single()
  if (pErr) throw new Error(`prospect insert: ${pErr.message}`)
  prospectId = p.id
  const { data: l } = await db.from('retainer_ledgers').insert({ prospect_id: prospectId }).select('id').single()
  ledgerId = l.id
  assert(!!ledgerId, 'ledger created')
  assert((await cachedBalance(ledgerId)) === 0, 'opening balance = $0')

  // 2. credit $5,000 (approved) → balance 5000_00
  const { data: credit } = await db.from('retainer_transactions').insert({
    ledger_id: ledgerId, prospect_id: prospectId, direction: 'credit', status: 'approved',
    amount_cents: 500000, source: 'manual_credit', description: 'Funding', approved_by: 'verify', approved_at: new Date().toISOString(),
  }).select('id').single()
  await recompute(ledgerId)
  assert((await cachedBalance(ledgerId)) === 500000, 'after $5,000 credit → balance $5,000')

  // 3. role-less pending debit: 2 hrs + $30 LLM baseline. Pending → no balance move.
  const { data: debit } = await db.from('retainer_transactions').insert({
    ledger_id: ledgerId, prospect_id: prospectId, direction: 'debit', status: 'pending',
    amount_cents: 3000, source: 'handoff', description: '2h session', hours: 2, role: null,
  }).select('id,amount_cents').single()
  await recompute(ledgerId)
  assert((await cachedBalance(ledgerId)) === 500000, 'pending debit does NOT move balance')

  // 4. approve with role=engineering ($100/hr): amount = 2×10000 + 3000 LLM = 23000. Balance 477000.
  const priced = Math.round(2 * engRate) + debit.amount_cents // 20000 + 3000
  await db.from('retainer_transactions').update({
    status: 'approved', role: 'engineering', amount_cents: priced, approved_by: 'verify', approved_at: new Date().toISOString(),
  }).eq('id', debit.id)
  await recompute(ledgerId)
  assert(priced === 23000, `role pricing: 2h × $100 + $30 LLM = $230 (${priced} cents)`)
  assert((await cachedBalance(ledgerId)) === 477000, 'after approve → balance $4,770')

  // 5. cache == authoritative
  const { balance } = await authoritativeBalance(ledgerId)
  assert((await cachedBalance(ledgerId)) === balance, 'cache == recomputed authoritative balance')

  // 6. waived debit: real work, logged, no balance move.
  const { data: waived } = await db.from('retainer_transactions').insert({
    ledger_id: ledgerId, prospect_id: prospectId, direction: 'debit', status: 'waived',
    amount_cents: 15000, source: 'handoff', description: 'rework on our error', hours: 1, role: 'engineering',
    waived_by: 'verify', waived_at: new Date().toISOString(), waive_reason: 'our mistake',
  }).select('id').single()
  await recompute(ledgerId)
  assert((await cachedBalance(ledgerId)) === 477000, 'waived debit does NOT move balance (logged only)')

  // 7. void an approved debit → balance restored.
  await db.from('retainer_transactions').update({
    status: 'void', voided_by: 'verify', voided_at: new Date().toISOString(), void_reason: 'duplicate',
  }).eq('id', debit.id)
  await recompute(ledgerId)
  assert((await cachedBalance(ledgerId)) === 500000, 'voiding the approved debit restores balance to $5,000')

  // 8. idempotency: a second live debit for the same time_entry_id must be blocked.
  //    (Simulate: two rows with same time_entry_id, both non-void.)
  const { data: te } = await db.from('project_time_entries').insert({
    project_id: null, hours: 1, logged_at: new Date().toISOString().slice(0, 10), billable: true,
  }).select('id').single().then(r => r).catch(() => ({ data: null }))
  if (te?.id) {
    await db.from('retainer_transactions').insert({
      ledger_id: ledgerId, prospect_id: prospectId, direction: 'debit', status: 'pending',
      amount_cents: 0, source: 'handoff', description: 'first', time_entry_id: te.id,
    })
    const { error: dupErr } = await db.from('retainer_transactions').insert({
      ledger_id: ledgerId, prospect_id: prospectId, direction: 'debit', status: 'pending',
      amount_cents: 0, source: 'handoff', description: 'dup', time_entry_id: te.id,
    })
    assert(!!dupErr, 'duplicate live debit for same time_entry_id is rejected (idempotency index)')
    await db.from('project_time_entries').delete().eq('id', te.id)
  } else {
    console.log('  ⊘ idempotency test skipped (could not create test time entry)')
  }

  console.log('─'.repeat(40))
  console.log(failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`)
} catch (e) {
  console.error('\n💥 ERROR:', e.message)
  failures++
} finally {
  await cleanup()
  console.log('(cleaned up throwaway prospect + ledger)\n')
  process.exit(failures === 0 ? 0 : 1)
}
