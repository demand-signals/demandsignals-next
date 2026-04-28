// ── credit-memos.ts ───────────────────────────────────────────────────
// Orchestrator for creating credit memos against invoices.
//
// Flow:
//   1. Validate the invoice exists + has prospect linkage
//   2. Validate amount doesn't exceed invoice's net paid (paid - prior memos)
//      unless kind='write_off' (which can credit any positive amount)
//   3. If kind='refund' AND payment_method='stripe_refund' AND auto_refund:
//        a. Call Stripe createStripeRefund() (idempotent on credit memo id)
//        b. On Stripe success, capture re_… id + payment_intent reference
//        c. On Stripe failure, throw — caller decides whether to fall back
//   4. Allocate CRM-CLIENT-MMDDYY{A} doc number
//   5. Insert credit_memos row (immutable from here)
//
// Multiple credit memos per invoice are allowed. The total credited is
// summed by getInvoicePaymentSummary and subtracted from paid_total.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { createStripeRefund } from '@/lib/stripe-sync'
import { isStripeEnabled } from '@/lib/stripe-client'

export type CreditMemoKind = 'refund' | 'goodwill' | 'dispute' | 'write_off'

export type CreditMemoPaymentMethod =
  | 'stripe_refund'
  | 'check'
  | 'wire'
  | 'cash'
  | 'other'
  | 'tik'
  | 'zero_balance'

export interface CreditMemo {
  id: string
  credit_memo_number: string
  invoice_id: string
  prospect_id: string
  amount_cents: number
  currency: string
  kind: CreditMemoKind
  reason: string
  notes: string | null
  payment_method: CreditMemoPaymentMethod | null
  payment_reference: string | null
  stripe_refund_id: string | null
  issued_at: string
  created_by: string | null
  created_at: string
}

export interface CreateCreditMemoInput {
  invoice_id: string
  amount_cents: number
  kind: CreditMemoKind
  reason: string
  notes?: string | null
  payment_method?: CreditMemoPaymentMethod | null
  payment_reference?: string | null
  /** When true (default for kind='refund' with payment_method='stripe_refund'),
   *  the orchestrator calls Stripe Refund API and captures re_…  Only meaningful
   *  if Stripe is enabled and the original payment was a stripe receipt. */
  auto_stripe_refund?: boolean
  /** Optional override for issued_at (defaults to now()). */
  issued_at?: string
  /** Auth user id for created_by audit. */
  created_by?: string | null
}

export interface CreateCreditMemoResult {
  ok: boolean
  credit_memo?: CreditMemo
  stripe_refund_id?: string | null
  error?: string
}

const TIK_KINDS = new Set<CreditMemoKind>(['goodwill', 'write_off'])

/**
 * Sum of prior credit memos against an invoice, in cents (excludes write_offs
 * by default — write-offs reduce outstanding but don't refund money). Pass
 * includeWriteOffs=true to include them (needed for paid-amount-cap checks).
 */
export async function getInvoiceCreditedCents(
  invoiceId: string,
  options?: { includeWriteOffs?: boolean },
): Promise<{ refunded_cents: number; goodwill_cents: number; write_off_cents: number; total_cents: number }> {
  const { data } = await supabaseAdmin
    .from('credit_memos')
    .select('kind, amount_cents')
    .eq('invoice_id', invoiceId)

  let refunded_cents = 0
  let goodwill_cents = 0
  let write_off_cents = 0
  for (const r of data ?? []) {
    if (r.kind === 'refund' || r.kind === 'dispute') refunded_cents += r.amount_cents
    else if (r.kind === 'goodwill') goodwill_cents += r.amount_cents
    else if (r.kind === 'write_off') write_off_cents += r.amount_cents
  }
  const total_cents =
    refunded_cents + goodwill_cents + (options?.includeWriteOffs ? write_off_cents : 0)
  return { refunded_cents, goodwill_cents, write_off_cents, total_cents }
}

/**
 * Create a credit memo. See top-of-file comment for the full flow.
 */
export async function createCreditMemo(
  input: CreateCreditMemoInput,
): Promise<CreateCreditMemoResult> {
  if (input.amount_cents <= 0) {
    return { ok: false, error: 'amount_cents must be > 0' }
  }
  if (!input.reason?.trim()) {
    return { ok: false, error: 'reason is required' }
  }

  // 1. Resolve the invoice + prospect.
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .select('id, prospect_id, total_due_cents, currency, status, kind')
    .eq('id', input.invoice_id)
    .maybeSingle()

  if (invErr) return { ok: false, error: `Invoice lookup: ${invErr.message}` }
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (!invoice.prospect_id) {
    return { ok: false, error: 'Invoice has no linked prospect; cannot issue credit memo' }
  }

  // 2. Cap check. For non-write_off kinds, the credit can't exceed (paid - prior credits).
  //    For write_off, allow any positive amount up to total_due (since we're zeroing out
  //    a balance the customer never paid).
  if (input.kind !== 'write_off') {
    const { data: receipts } = await supabaseAdmin
      .from('receipts')
      .select('amount_cents')
      .eq('invoice_id', input.invoice_id)
    const paid_cents = (receipts ?? []).reduce((s, r) => s + r.amount_cents, 0)
    const prior = await getInvoiceCreditedCents(input.invoice_id, { includeWriteOffs: false })
    const remaining_creditable = paid_cents - prior.total_cents
    if (input.amount_cents > remaining_creditable) {
      return {
        ok: false,
        error:
          `Cannot credit $${(input.amount_cents / 100).toFixed(2)} — only ` +
          `$${(remaining_creditable / 100).toFixed(2)} of paid balance is available ` +
          `(paid $${(paid_cents / 100).toFixed(2)}, prior credits $${(prior.total_cents / 100).toFixed(2)}).`,
      }
    }
  } else {
    // write_off: cap to total_due_cents minus prior write_offs.
    const prior = await getInvoiceCreditedCents(input.invoice_id, { includeWriteOffs: true })
    const remaining_writeoff = invoice.total_due_cents - prior.total_cents
    if (input.amount_cents > remaining_writeoff) {
      return {
        ok: false,
        error:
          `Cannot write off $${(input.amount_cents / 100).toFixed(2)} — only ` +
          `$${(remaining_writeoff / 100).toFixed(2)} of invoice balance is available.`,
      }
    }
  }

  // 3. TIK guard: refund kind cannot be issued against a TIK ledger; that's
  //    semantically a goodwill / write_off depending on intent.
  const payment_method = input.payment_method ?? null
  if (input.kind === 'refund' && payment_method === 'tik') {
    return {
      ok: false,
      error:
        'Refund cannot use payment_method=tik — TIK is non-cash. Use kind=goodwill or write_off instead.',
    }
  }

  // 4. Optional Stripe refund.
  // Default: when kind='refund' AND payment_method='stripe_refund' AND
  // auto_stripe_refund is true (or omitted), call Stripe.
  let stripe_refund_id: string | null = null
  let resolved_payment_reference: string | null = input.payment_reference ?? null
  const wantsAutoStripe =
    input.kind === 'refund' &&
    payment_method === 'stripe_refund' &&
    (input.auto_stripe_refund ?? true)

  if (wantsAutoStripe) {
    if (!(await isStripeEnabled())) {
      return {
        ok: false,
        error:
          'Stripe is disabled in config (stripe_enabled=false). ' +
          'Either enable Stripe or set auto_stripe_refund=false and supply a manual payment_reference.',
      }
    }
    try {
      const refund = await createStripeRefund({
        invoiceId: input.invoice_id,
        amountCents: input.amount_cents,
        reason: 'requested_by_customer',
        metadata: {
          dsig_invoice_id: input.invoice_id,
          dsig_credit_memo_kind: input.kind,
        },
      })
      stripe_refund_id = refund.id
      resolved_payment_reference =
        (typeof refund.payment_intent === 'string'
          ? refund.payment_intent
          : refund.payment_intent?.id) ?? resolved_payment_reference
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown Stripe error'
      return {
        ok: false,
        error: `Stripe refund failed: ${msg}. Credit memo NOT created — fix Stripe issue or retry with auto_stripe_refund=false.`,
      }
    }
  }

  // 5. Allocate CRM number, then insert the row in a two-step pattern that
  //    matches how invoices/receipts handle PENDING-fallback. Insert first
  //    with PENDING-{uuid}, then rename to the real CRM number.
  const tempNumber = `PENDING-${crypto.randomUUID()}`

  const { data: cm, error: cmErr } = await supabaseAdmin
    .from('credit_memos')
    .insert({
      credit_memo_number: tempNumber,
      invoice_id: input.invoice_id,
      prospect_id: invoice.prospect_id,
      amount_cents: input.amount_cents,
      currency: invoice.currency,
      kind: input.kind,
      reason: input.reason.trim(),
      notes: input.notes?.trim() || null,
      // Default the method when caller omitted it: write_off / goodwill have
      // no payment, so leave NULL; refund / dispute should at least carry
      // the method so the audit row is meaningful.
      payment_method: TIK_KINDS.has(input.kind) ? null : payment_method,
      payment_reference: resolved_payment_reference,
      stripe_refund_id,
      issued_at: input.issued_at ?? new Date().toISOString(),
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single()

  if (cmErr || !cm) {
    return { ok: false, error: `Credit memo insert: ${cmErr?.message ?? 'no row returned'}` }
  }

  // Allocate the real number.
  try {
    const cmNumber = await allocateDocNumber({
      doc_type: 'CRM',
      prospect_id: invoice.prospect_id,
      ref_table: 'credit_memos',
      ref_id: cm.id,
    })
    const { error: renameErr } = await supabaseAdmin
      .from('credit_memos')
      .update({ credit_memo_number: cmNumber })
      .eq('id', cm.id)
    if (renameErr) {
      console.error('[createCreditMemo] number rename failed:', renameErr.message)
    } else {
      cm.credit_memo_number = cmNumber
    }
  } catch (numErr) {
    console.error(
      '[createCreditMemo] doc numbering failed:',
      numErr instanceof Error ? numErr.message : numErr,
    )
    // Leave PENDING- in place; admin can fix manually. Returning ok:true
    // because the credit + Stripe refund (if any) already committed.
  }

  // Re-fetch to surface authoritative current state.
  const { data: fresh } = await supabaseAdmin
    .from('credit_memos')
    .select('*')
    .eq('id', cm.id)
    .single()

  return {
    ok: true,
    credit_memo: (fresh ?? cm) as CreditMemo,
    stripe_refund_id,
  }
}

/** List credit memos for an invoice, newest first. */
export async function listCreditMemosForInvoice(invoiceId: string): Promise<CreditMemo[]> {
  const { data } = await supabaseAdmin
    .from('credit_memos')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('issued_at', { ascending: false })
  return (data ?? []) as CreditMemo[]
}
