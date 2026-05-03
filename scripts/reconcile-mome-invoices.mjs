// Reconcile MOME invoice ledger.
//
// Background (see chat 2026-05-03):
//   - SOW-MOME-042426A: $1,775 total, $1,275 TIK (mechanic services), $500 cash.
//   - System auto-issued INV-MOME-042726A ($250 paid via check) +
//     INV-MOME-042726B ($250 viewed, unpaid) for the two cash installments.
//   - On 2026-05-03, an admin manually issued INV-MOME-050226B with a
//     $1,250 phantom "Single Platform Website" line item + cosmetic $750
//     TIK reduction → $250 net due. Client paid the $250 via Stripe.
//   - Net effect: client paid $500 cash total which exactly matches the
//     SOW. But the documents say something else, payment installment #2
//     is unpaid, and a $1,250 phantom invoice exists.
//
// What this script does (no Stripe refund — payment trail is real):
//   1. Rewrite INV-MOME-050226B: zero the cosmetic $750 TIK, replace the
//      $1,250 line item with a $250 "Cash payment toward SOW Installment 2"
//      line. Status stays paid. Stripe receipt stays attached.
//   2. Void INV-MOME-042726B with reason linking to 050226B as superseder.
//   3. Re-link payment_installment #2 to 050226B and mark it paid.
//   4. Append explanatory activity-log note.
//   5. Leave the two unsent $20 PHP Hosting drafts alone (they'll be
//      scheduled to fire 30 days post-payment once schedule-send is wired
//      for new drafts on this prospect).
//   6. Leave TIK ledger alone — the cosmetic $750 was never linked to
//      the real trade_credits row, so nothing to undo.
//
// Idempotent: re-running after success is a no-op (each step checks
// current state before writing).
//
// Usage:
//   node scripts/reconcile-mome-invoices.mjs           # dry run, prints plan
//   node scripts/reconcile-mome-invoices.mjs --apply   # execute

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
const dollars = (c) => `$${(c / 100).toFixed(2)}`

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Hardcoded ids — verified via check-mome-state2/3/5 diagnostic earlier.
const PROSPECT_ID = '7789d64d-70cd-4e0d-8cbc-19bbf7ade8d2'
const INV_042726A_ID = 'a063f2af-4080-46ed-852e-ce765272bb9b' // $250 paid check (Installment 1)
const INV_042726B_ID = '98b61c72-67d8-4e61-860e-c6c84dd91c47' // $250 viewed unpaid (Installment 2 — to void)
const INV_050226B_ID = '2879cd67-7a64-491d-91a9-e78609860f32' // $250 paid Stripe (the bad one — to rewrite)
const INSTALLMENT_2_ID = '9fc52e7e-9229-45da-a8b4-47b77443277d'

const banner = (s) => console.log(`\n${'═'.repeat(60)}\n${s}\n${'═'.repeat(60)}`)
const todo = (s) => console.log(`  ${APPLY ? '→' : '·'} ${s}`)

if (!APPLY) {
  console.log('\nDRY RUN — pass --apply to execute.\n')
}

// ── Step 0: snapshot current state for the report ───────────────────
const { data: invs, error: invsErr } = await admin
  .from('invoices')
  .select('id, invoice_number, status, total_due_cents, subtotal_cents, trade_credit_cents, voided_at, superseded_by_invoice_id')
  .in('id', [INV_042726A_ID, INV_042726B_ID, INV_050226B_ID])

if (invsErr) { console.error(invsErr); process.exit(1) }

banner('CURRENT STATE')
for (const i of invs ?? []) {
  console.log(`  ${i.invoice_number}  status=${i.status}  subtotal=${dollars(i.subtotal_cents ?? 0)}  TIK=${dollars(i.trade_credit_cents ?? 0)}  total_due=${dollars(i.total_due_cents ?? 0)}${i.voided_at ? ' [VOID]' : ''}`)
}

const inv050226B = invs.find((x) => x.id === INV_050226B_ID)
const inv042726B = invs.find((x) => x.id === INV_042726B_ID)

// ── Step 1: rewrite INV-MOME-050226B ────────────────────────────────
banner('STEP 1 — Rewrite INV-MOME-050226B (the bad one)')

const needsRewrite =
  inv050226B.subtotal_cents !== 25000 ||
  inv050226B.trade_credit_cents !== 0

if (!needsRewrite) {
  todo('skip — already at subtotal=$250.00 + TIK=$0.00')
} else {
  todo(`zero trade_credit_cents (was ${dollars(inv050226B.trade_credit_cents)})`)
  todo(`zero trade_credit_description (was cosmetic "PIK ...")`)
  todo(`reset subtotal_cents to $250.00 (was ${dollars(inv050226B.subtotal_cents)})`)
  todo(`replace line item: "Cash payment toward SOW-MOME-042426A — Installment 2" qty 1 @ $250.00`)

  if (APPLY) {
    // Update the invoice row
    const upd1 = await admin
      .from('invoices')
      .update({
        trade_credit_cents: 0,
        trade_credit_description: null,
        subtotal_cents: 25000,
        // total_due_cents stays at 25000 (was already correct after the cosmetic
        // TIK math: 1250 - 750 - 250 deposit = 250; rewrite makes it 250 - 0 = 250)
        total_due_cents: 25000,
      })
      .eq('id', INV_050226B_ID)
    if (upd1.error) { console.error('FAIL step 1 invoice update:', upd1.error); process.exit(1) }

    // Replace line items: delete existing, insert one new
    const del = await admin.from('invoice_line_items').delete().eq('invoice_id', INV_050226B_ID)
    if (del.error) { console.error('FAIL step 1 line-items delete:', del.error); process.exit(1) }

    const ins = await admin.from('invoice_line_items').insert({
      invoice_id: INV_050226B_ID,
      sort_order: 0,
      description: 'Cash payment toward SOW-MOME-042426A — Installment 2',
      quantity: 1,
      unit_price_cents: 25000,
      discount_pct: 0,
      line_total_cents: 25000,
    })
    if (ins.error) { console.error('FAIL step 1 line-items insert:', ins.error); process.exit(1) }
    console.log('  ✓ rewritten')
  }
}

// ── Step 2: void INV-MOME-042726B ──────────────────────────────────
banner('STEP 2 — Void INV-MOME-042726B (duplicate Installment 2)')

if (inv042726B.status === 'void') {
  todo('skip — already voided')
} else {
  todo('set status=void')
  todo('set voided_at=now()')
  todo('set void_reason="Duplicate Installment 2 — superseded by INV-MOME-050226B (admin-issued duplicate; payment received against the duplicate; both invoices represent the same SOW Installment #2)"')
  todo(`set superseded_by_invoice_id=${INV_050226B_ID}`)

  if (APPLY) {
    const r = await admin.from('invoices').update({
      status: 'void',
      voided_at: new Date().toISOString(),
      void_reason: 'Duplicate Installment 2 — superseded by INV-MOME-050226B (admin-issued duplicate; payment received against the duplicate; both invoices represent the same SOW Installment #2)',
      superseded_by_invoice_id: INV_050226B_ID,
    }).eq('id', INV_042726B_ID)
    if (r.error) { console.error('FAIL step 2:', r.error); process.exit(1) }
    console.log('  ✓ voided')
  }
}

// ── Step 3: re-link installment #2 to 050226B and mark paid ────────
banner('STEP 3 — Re-link payment installment #2 to INV-MOME-050226B')

const { data: inst2 } = await admin
  .from('payment_installments')
  .select('id, invoice_id, status, amount_cents, amount_paid_cents')
  .eq('id', INSTALLMENT_2_ID)
  .single()

if (inst2.invoice_id === INV_050226B_ID && inst2.status === 'paid') {
  todo('skip — already linked + paid')
} else {
  todo(`set invoice_id=${INV_050226B_ID} (was ${inst2.invoice_id})`)
  todo(`set status=paid (was ${inst2.status})`)
  todo(`set amount_paid_cents=${inst2.amount_cents} (was ${inst2.amount_paid_cents})`)

  if (APPLY) {
    const r = await admin.from('payment_installments').update({
      invoice_id: INV_050226B_ID,
      status: 'paid',
      amount_paid_cents: inst2.amount_cents,
    }).eq('id', INSTALLMENT_2_ID)
    if (r.error) { console.error('FAIL step 3:', r.error); process.exit(1) }
    console.log('  ✓ relinked')
  }
}

// ── Step 4: activity log note ───────────────────────────────────────
banner('STEP 4 — Append explanatory activity-log note')

// Idempotency: skip if a recon note with this marker already exists.
const RECON_MARKER = '[mome-reconcile-2026-05-03]'
const { data: existing } = await admin
  .from('activities')
  .select('id, subject')
  .eq('prospect_id', PROSPECT_ID)
  .ilike('body', `%${RECON_MARKER}%`)
  .limit(1)

if ((existing ?? []).length > 0) {
  todo('skip — recon note already exists')
} else {
  const subject = 'Invoice reconciliation — SOW-MOME-042426A'
  const body = [
    RECON_MARKER,
    '',
    'Resolved 2026-05-03. Client payments are correct: $500 cash total received ($250 check on 2026-04-27, $250 Stripe on 2026-05-03), exactly matching the SOW cash portion ($1,775 total - $1,275 TIK = $500 cash).',
    '',
    'Internal admin error: a non-Hunter admin manually issued INV-MOME-050226B on 2026-05-03 with a $1,250 phantom "Single Platform Website" line item and a cosmetic $750 TIK reduction, instead of using the existing INV-MOME-042726B (Installment 2) that the SOW conversion had auto-created. Client paid the duplicate via Stripe before the error was caught.',
    '',
    'Reconciliation:',
    '• INV-MOME-050226B rewritten in place — line item now reads "Cash payment toward SOW-MOME-042426A — Installment 2" $250. Cosmetic $750 TIK zeroed. Stripe receipt RCT-MOME-050226A stays attached.',
    '• INV-MOME-042726B voided as duplicate; superseded_by_invoice_id points to 050226B.',
    '• Payment installment #2 re-linked to 050226B and marked paid.',
    '• TIK ledger unchanged — the cosmetic $750 was never recorded against the real trade_credits row, so no ledger movement to undo.',
    '',
    'Open items: trade_credits row (Mechanic Services) still shows $1,275 outstanding — client has not yet delivered any TIK service.',
  ].join('\n')

  todo(`insert activity row: type=note, subject="${subject}"`)

  if (APPLY) {
    const r = await admin.from('activities').insert({
      prospect_id: PROSPECT_ID,
      type: 'note',
      subject,
      body,
      status: null,
      created_by: 'system',
    })
    if (r.error) { console.error('FAIL step 4:', r.error); process.exit(1) }
    console.log('  ✓ note added')
  }
}

// ── Final: dump post-state ──────────────────────────────────────────
banner('POST-RECONCILIATION STATE')

const { data: invsAfter } = await admin
  .from('invoices')
  .select('invoice_number, status, subtotal_cents, trade_credit_cents, total_due_cents, voided_at, superseded_by_invoice_id')
  .in('id', [INV_042726A_ID, INV_042726B_ID, INV_050226B_ID])
  .order('invoice_number')

for (const i of invsAfter ?? []) {
  console.log(`  ${i.invoice_number}  status=${i.status}  subtotal=${dollars(i.subtotal_cents)}  TIK=${dollars(i.trade_credit_cents)}  total_due=${dollars(i.total_due_cents)}${i.voided_at ? ` [VOID — superseded by ${i.superseded_by_invoice_id?.slice(0, 8) ?? '—'}]` : ''}`)
}

const { data: instAfter } = await admin
  .from('payment_installments')
  .select('sequence, description, amount_cents, amount_paid_cents, status, invoice_id')
  .eq('id', INSTALLMENT_2_ID)
  .single()
console.log(`\n  installment #${instAfter.sequence}: ${instAfter.description}  ${dollars(instAfter.amount_paid_cents)}/${dollars(instAfter.amount_cents)}  status=${instAfter.status}  invoice=${instAfter.invoice_id?.slice(0, 8)}…`)

const { data: tikAfter } = await admin
  .from('trade_credits')
  .select('original_amount_cents, remaining_cents, status, description')
  .eq('sow_document_id', 'fe1eb7a7-ffc6-4753-9f35-2970caac9f71')
  .single()
console.log(`\n  TIK: ${dollars(tikAfter.original_amount_cents)} → remaining ${dollars(tikAfter.remaining_cents)}  status=${tikAfter.status} (${tikAfter.description})`)

console.log(`\n${APPLY ? '✓ Applied.' : 'Dry run complete. Pass --apply to execute.'}\n`)
