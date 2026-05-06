// Retry failed invoice_scheduled_sends rows.
//
// Use after migration 046 (prospects.country) is applied. The 3 overdue
// rows that failed with "column prospects_1.country does not exist" can
// be flipped back to status='scheduled' so the cron picks them up on its
// next 5-min tick.
//
// Idempotent: only flips rows whose error_message contains 'country'
// (the specific signature of this regression). Other failed rows aren't
// touched.
//
// Read-only by default. Pass --apply to flip.

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

const APPLY = process.argv.includes('--apply')
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

console.log(APPLY ? 'APPLY MODE — will flip rows.' : 'DRY RUN — pass --apply to flip.')

// First confirm migration 046 is applied. If country doesn't exist
// yet, the retry would just fail again on the next cron tick.
const probe = await admin.from('prospects').select('id, country').limit(1)
if (probe.error) {
  console.error(`\n✗ Migration 046 NOT applied yet: ${probe.error.message}`)
  console.error('  Apply the migration in Supabase SQL Editor first, then re-run this script.')
  process.exit(1)
}
console.log('✓ Migration 046 confirmed applied (prospects.country exists).')

// Find failed rows whose error matches the country regression.
const { data: rows, error } = await admin
  .from('invoice_scheduled_sends')
  .select('id, invoice_id, send_at, channel, kind, error_message, fired_at, invoice:invoices(invoice_number, status)')
  .eq('status', 'failed')
  .ilike('error_message', '%country%')

if (error) { console.error(error); process.exit(1) }

console.log(`\nFound ${rows?.length ?? 0} failed row(s) matching country regression:\n`)
for (const r of rows ?? []) {
  const inv = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice
  console.log(`  ${inv?.invoice_number ?? r.invoice_id?.slice(0, 8)}  send_at=${r.send_at}  channel=${r.channel}  kind=${r.kind}`)
  console.log(`    ERROR was: ${r.error_message}`)
  console.log(`    invoice status: ${inv?.status}`)
}

if (!APPLY) {
  console.log('\n(dry run — no changes made)')
  process.exit(0)
}

if (!rows || rows.length === 0) {
  console.log('Nothing to retry.')
  process.exit(0)
}

// Flip back to status='scheduled', clear fired_at + error_message so
// the cron treats them as fresh on the next tick. Only flip rows where
// the parent invoice is still in draft (issue_and_send semantics need
// a draft to act on); skip any whose invoice has been manually issued
// or voided in the meantime.
const skipped = []
const flipped = []
for (const r of rows) {
  const inv = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice
  if (inv?.status !== 'draft') {
    skipped.push({ r, reason: `invoice status is ${inv?.status}, not draft` })
    continue
  }
  const { error: upErr } = await admin
    .from('invoice_scheduled_sends')
    .update({
      status: 'scheduled',
      fired_at: null,
      error_message: null,
    })
    .eq('id', r.id)
  if (upErr) {
    skipped.push({ r, reason: `update error: ${upErr.message}` })
    continue
  }
  flipped.push(r)
}

console.log(`\n✓ Flipped ${flipped.length} row(s) back to scheduled.`)
for (const r of flipped) {
  const inv = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice
  console.log(`  ${inv?.invoice_number ?? r.invoice_id?.slice(0, 8)}`)
}

if (skipped.length > 0) {
  console.log(`\n! Skipped ${skipped.length} row(s):`)
  for (const { r, reason } of skipped) {
    const inv = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice
    console.log(`  ${inv?.invoice_number ?? r.invoice_id?.slice(0, 8)} — ${reason}`)
  }
}

console.log('\nThe Vercel cron at /api/cron/scheduled-sends runs every 5 minutes — these will fire on the next tick.')
