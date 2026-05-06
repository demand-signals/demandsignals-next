// Diagnose: scheduled invoice sends aren't firing.
//
// Check 1: list all current invoice_scheduled_sends rows + their status,
//          send_at, fired_at, error_message. Shows what cron has actually
//          processed vs what's still queued.
// Check 2: any rows whose send_at is in the past but status='scheduled'
//          (these are the ones that should have fired but haven't).
// Check 3: any rows in 'failed' status with error_message set (cron tried
//          but the dispatcher returned an error).
//
// Read-only — no writes.

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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const now = new Date()
console.log(`Now: ${now.toISOString()}`)

// All scheduled rows for invoices, with the invoice number for context
const { data: rows, error } = await admin
  .from('invoice_scheduled_sends')
  .select('id, invoice_id, channel, send_at, status, kind, fired_at, error_message, created_at, override_email, override_phone, invoice:invoices(invoice_number, status)')
  .order('send_at', { ascending: true })

if (error) { console.error(error); process.exit(1) }

console.log(`\nTotal rows: ${rows?.length ?? 0}`)

const overdue = []
const upcoming = []
const fired = []
const failed = []
const cancelled = []

for (const r of rows ?? []) {
  const sendAt = new Date(r.send_at)
  const inv = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice
  const label = `${inv?.invoice_number ?? r.invoice_id?.slice(0, 8)} · ${r.channel} · kind=${r.kind} · status=${r.status} · invoice_status=${inv?.status ?? '?'}`
  if (r.status === 'scheduled') {
    if (sendAt < now) overdue.push({ r, sendAt, label })
    else upcoming.push({ r, sendAt, label })
  } else if (r.status === 'fired') {
    fired.push({ r, sendAt, label })
  } else if (r.status === 'failed') {
    failed.push({ r, sendAt, label })
  } else if (r.status === 'cancelled') {
    cancelled.push({ r, sendAt, label })
  }
}

console.log(`\n══ OVERDUE (status='scheduled' AND send_at < now) — ${overdue.length} ══`)
for (const { r, sendAt, label } of overdue) {
  console.log(`  ${sendAt.toISOString()}  ${label}`)
  console.log(`    id=${r.id}  invoice_id=${r.invoice_id}  created=${r.created_at}`)
}

console.log(`\n══ UPCOMING (status='scheduled' AND send_at > now) — ${upcoming.length} ══`)
for (const { r, sendAt, label } of upcoming) {
  console.log(`  ${sendAt.toISOString()}  ${label}`)
}

console.log(`\n══ FIRED — ${fired.length} ══`)
for (const { r, sendAt, label } of fired) {
  console.log(`  ${sendAt.toISOString()}  ${label}  fired_at=${r.fired_at ?? '—'}`)
}

console.log(`\n══ FAILED — ${failed.length} ══`)
for (const { r, sendAt, label } of failed) {
  console.log(`  ${sendAt.toISOString()}  ${label}  fired_at=${r.fired_at ?? '—'}`)
  if (r.error_message) console.log(`    ERROR: ${r.error_message}`)
}

console.log(`\n══ CANCELLED — ${cancelled.length} ══`)
for (const { r, sendAt, label } of cancelled) {
  console.log(`  ${sendAt.toISOString()}  ${label}`)
}

// Also check sow queue if exists
const { data: sowRows, error: sowErr } = await admin
  .from('sow_scheduled_sends')
  .select('id, sow_id, channel, send_at, status, kind, fired_at, error_message')
  .order('send_at', { ascending: true })

if (!sowErr) {
  console.log(`\n\n══ SOW SCHEDULED SENDS — ${sowRows?.length ?? 0} ══`)
  for (const r of sowRows ?? []) {
    const sendAt = new Date(r.send_at)
    const overdueTag = r.status === 'scheduled' && sendAt < now ? ' [OVERDUE]' : ''
    console.log(`  ${sendAt.toISOString()}  ${r.channel}  kind=${r.kind}  status=${r.status}${overdueTag}`)
    if (r.error_message) console.log(`    ERROR: ${r.error_message}`)
  }
}
