// One-shot: delete the two test SOWs Hunter flagged + all their dependent
// rows + R2 PDFs.
//
// IMPORTANT — this script bypasses the API safety rule that accepted SOWs
// are append-only. It exists as an emergency hand-cleanup tool for test
// data on the self-prospect (DSIG → DSIG). DO NOT use against real
// client SOWs. The DELETE /api/admin/sow/[id] route correctly refuses
// to touch accepted/declined/void SOWs through the UI; if you find
// yourself wanting to run this script against client data, that's a
// signal to use the void/refund flows on the dependents instead.
//
// Targets (DSIG → DSIG self-prospect, all $1 test data):
//   SOW-DSIG-042726A  (sow_id=5ae16ea1-...)  — accepted
//   SOW-DSIG-042826A  (sow_id=6c3b6a61-...)  — accepted
//
// Each SOW has:
//   - 1 deposit invoice (already voided by Hunter)
//   - 1 receipt against that invoice (Stripe $1 test)
//   - 1 trade_credit (one fulfilled with 1 drawdown, one outstanding)
//   - 1 R2 PDF at sow/<number>.pdf
//
// FK order (verified against migrations 011/012d/019/025/027/028):
//   1. Delete receipts pointing at the deposit invoice (RESTRICT on invoices)
//   2. Delete trade_credit_drawdowns (CASCADE from trade_credits, but explicit)
//   3. Delete trade_credits (would otherwise SET NULL on sow_document_id)
//   4. Delete deposit invoices (cascades line_items + logs + scheduled_sends;
//      sets sow_documents.deposit_invoice_id = NULL)
//   5. Delete the SOW row (cascades sow_scheduled_sends + payment_schedules)
//   6. Delete R2 PDFs (best-effort — orphan blobs are cheap)
//
// All deletes scoped by id — no LIKE/ILIKE wildcards, no chance of
// over-deletion. Idempotent: re-running after success is a no-op
// (each step queries first and skips when nothing matches).
//
// Usage:
//   node scripts/delete-test-sows.mjs           # dry run
//   node scripts/delete-test-sows.mjs --apply   # execute

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

// Hardcoded ids verified via check-test-sows-2.mjs.
const TARGETS = [
  {
    sow_id: '5ae16ea1-d474-4381-a481-f1a521c2171d',
    sow_number: 'SOW-DSIG-042726A',
    deposit_invoice_id: 'c19a2b65-c76d-4550-adef-8d51277e58aa',
    deposit_invoice_number: 'INV-DSIG-042726B',
    trade_credit_id: '9dcd5317-a520-475d-8ecb-95ec4d7a5ceb',
    pdf_key: 'sow/SOW-DSIG-042726A.pdf',
  },
  {
    sow_id: '6c3b6a61-32c5-41f4-91d7-e30f643b9f40',
    sow_number: 'SOW-DSIG-042826A',
    deposit_invoice_id: '95f6d89e-6b7c-4aa1-bfdb-e0063046f239',
    deposit_invoice_number: 'INV-DSIG-042826A',
    trade_credit_id: 'edcf3f3b-2618-473e-b834-72a356198c99',
    pdf_key: 'sow/SOW-DSIG-042826A.pdf',
  },
]

const banner = (s) => console.log(`\n${'═'.repeat(60)}\n${s}\n${'═'.repeat(60)}`)
const todo = (s) => console.log(`  ${APPLY ? '→' : '·'} ${s}`)

if (!APPLY) console.log('\nDRY RUN — pass --apply to execute.\n')

for (const t of TARGETS) {
  banner(`${t.sow_number}`)

  // ── Verify the SOW still exists (idempotency check) ─────────────
  const { data: sowExists } = await admin
    .from('sow_documents')
    .select('id, status')
    .eq('id', t.sow_id)
    .maybeSingle()

  if (!sowExists) {
    console.log('  ✓ already deleted — skipping')
    continue
  }
  console.log(`  current SOW status: ${sowExists.status}`)

  // ── 1a. Delete credit_memos that reference the deposit invoice ───
  // credit_memos.invoice_id is RESTRICT (migration 032) so they must
  // go before the invoice. Test data only — these are $1 refund memos
  // from the same self-prospect testing.
  const { data: memos } = await admin
    .from('credit_memos')
    .select('id, credit_memo_number, amount_cents, kind, reason')
    .eq('invoice_id', t.deposit_invoice_id)

  if (memos && memos.length > 0) {
    for (const m of memos) {
      todo(`delete credit_memo ${m.credit_memo_number} ($${(m.amount_cents / 100).toFixed(2)} ${m.kind}: ${m.reason})`)
    }
    if (APPLY) {
      const { error } = await admin.from('credit_memos').delete().in('id', memos.map((m) => m.id))
      if (error) { console.error(`  FAIL credit_memos: ${error.message}`); process.exit(1) }
      console.log('  ✓ credit_memos deleted')
    }
  } else {
    todo('no credit_memos to delete')
  }

  // ── 1b. Delete receipts that reference the deposit invoice ───────
  const { data: rcts } = await admin
    .from('receipts')
    .select('id, receipt_number, amount_cents')
    .eq('invoice_id', t.deposit_invoice_id)

  if (rcts && rcts.length > 0) {
    for (const r of rcts) {
      todo(`delete receipt ${r.receipt_number} ($${(r.amount_cents / 100).toFixed(2)})`)
    }
    if (APPLY) {
      const { error } = await admin.from('receipts').delete().in('id', rcts.map((r) => r.id))
      if (error) { console.error(`  FAIL receipts: ${error.message}`); process.exit(1) }
      console.log('  ✓ receipts deleted')
    }
  } else {
    todo('no receipts to delete')
  }

  // ── 2. Delete trade_credit_drawdowns (CASCADE would handle this,
  //      but explicit is safer + lets dry-run preview) ─────────────
  const { data: dds } = await admin
    .from('trade_credit_drawdowns')
    .select('id, amount_cents, description')
    .eq('trade_credit_id', t.trade_credit_id)

  if (dds && dds.length > 0) {
    for (const d of dds) {
      todo(`delete drawdown ${d.id} ($${(d.amount_cents / 100).toFixed(2)} — ${d.description})`)
    }
    if (APPLY) {
      const { error } = await admin.from('trade_credit_drawdowns').delete().in('id', dds.map((d) => d.id))
      if (error) { console.error(`  FAIL drawdowns: ${error.message}`); process.exit(1) }
      console.log('  ✓ drawdowns deleted')
    }
  } else {
    todo('no drawdowns to delete')
  }

  // ── 3. Delete the trade_credit row ──────────────────────────────
  const { data: tc } = await admin
    .from('trade_credits')
    .select('id, status, original_amount_cents')
    .eq('id', t.trade_credit_id)
    .maybeSingle()

  if (tc) {
    todo(`delete trade_credit ${tc.id} ($${(tc.original_amount_cents / 100).toFixed(2)} — ${tc.status})`)
    if (APPLY) {
      const { error } = await admin.from('trade_credits').delete().eq('id', tc.id)
      if (error) { console.error(`  FAIL trade_credit: ${error.message}`); process.exit(1) }
      console.log('  ✓ trade_credit deleted')
    }
  } else {
    todo('no trade_credit to delete')
  }

  // ── 4. Delete the deposit invoice (cascades line_items + logs;
  //      sets sow_documents.deposit_invoice_id = NULL) ─────────────
  const { data: inv } = await admin
    .from('invoices')
    .select('id, invoice_number, status, total_due_cents')
    .eq('id', t.deposit_invoice_id)
    .maybeSingle()

  if (inv) {
    todo(`delete invoice ${inv.invoice_number} (status=${inv.status}, $${(inv.total_due_cents / 100).toFixed(2)})`)
    if (APPLY) {
      const { error } = await admin.from('invoices').delete().eq('id', inv.id)
      if (error) { console.error(`  FAIL invoice: ${error.message}`); process.exit(1) }
      console.log('  ✓ invoice deleted')
    }
  } else {
    todo('no invoice to delete')
  }

  // ── 5. Delete the SOW row (cascades scheduled_sends, payment_schedules;
  //      SETs NULL on projects, email_engagement, page_visits) ────────
  todo(`delete sow_documents row (${t.sow_number}, id=${t.sow_id})`)
  if (APPLY) {
    const { error } = await admin.from('sow_documents').delete().eq('id', t.sow_id)
    if (error) { console.error(`  FAIL sow: ${error.message}`); process.exit(1) }
    console.log('  ✓ sow deleted')
  }

  // ── 6. R2 PDF cleanup (best-effort) ─────────────────────────────
  // Using AWS SDK directly because importing src/lib/r2-storage.ts from a
  // plain .mjs script needs a TS loader. R2 is S3-compatible.
  todo(`delete R2 object ${t.pdf_key}`)
  if (APPLY) {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.R2_PRIVATE_BUCKET,
        Key: t.pdf_key,
      }))
      console.log('  ✓ R2 PDF deleted')
    } catch (e) {
      console.warn(`  ! R2 delete failed (orphan blob is cheap, ignoring): ${e instanceof Error ? e.message : e}`)
    }
  }
}

console.log(`\n${APPLY ? '✓ Done.' : 'Dry run complete. Pass --apply to execute.'}\n`)
