// ── invoice-context.ts ────────────────────────────────────────────────
// Helpers that compute derived data needed by invoice rendering:
//   • Payment summary (cash paid, TIK paid, outstanding) from receipts
//   • Project meta (name + sow_number) by walking notes back to a project
//
// These are presentation-only concerns — the canonical totals on the
// invoice row don't change. We surface them so PDFs and the public
// magic-link page can show "Paid (cash)", "Paid (trade)", and the real
// "Outstanding" balance when partial payments have been recorded.

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface InvoicePaymentSummary {
  paid_cash_cents: number
  paid_tik_cents: number
  paid_total_cents: number
  outstanding_cents: number
  receipt_count: number
  is_partially_paid: boolean
  is_fully_paid: boolean
}

export interface InvoiceProjectMeta {
  name: string | null
  sow_number: string | null
  /** Project-level outstanding from the payment schedule, when one exists. */
  schedule_outstanding?: ScheduleOutstanding | null
}

export interface ScheduleOutstanding {
  /** Sum of cash installment amount_cents minus amount_paid_cents. */
  cash_remaining_cents: number
  /** Sum of TIK installment amount_cents minus amount_paid_cents. */
  tik_remaining_cents: number
  /** Total cash already collected across all installments. */
  cash_paid_cents: number
  /** Total TIK already drawn down across all installments. */
  tik_paid_cents: number
  /** True iff the schedule has more than one installment (i.e. this invoice is one of several). */
  is_multi_installment: boolean
}

const TIK_METHODS = new Set(['tik', 'trade'])

/**
 * Compute payment summary from the receipts table for one invoice.
 * Cash methods: stripe, check, wire, cash, other, zero_balance.
 * TIK methods: tik, trade.
 */
export async function getInvoicePaymentSummary(
  invoiceId: string,
  totalDueCents: number,
): Promise<InvoicePaymentSummary> {
  const { data: receipts } = await supabaseAdmin
    .from('receipts')
    .select('amount_cents, payment_method')
    .eq('invoice_id', invoiceId)

  let paid_cash_cents = 0
  let paid_tik_cents = 0
  for (const r of receipts ?? []) {
    if (TIK_METHODS.has(r.payment_method)) paid_tik_cents += r.amount_cents
    else paid_cash_cents += r.amount_cents
  }
  const paid_total_cents = paid_cash_cents + paid_tik_cents
  const outstanding_cents = Math.max(0, totalDueCents - paid_total_cents)

  return {
    paid_cash_cents,
    paid_tik_cents,
    paid_total_cents,
    outstanding_cents,
    receipt_count: receipts?.length ?? 0,
    is_partially_paid: paid_total_cents > 0 && outstanding_cents > 0,
    is_fully_paid: paid_total_cents >= totalDueCents,
  }
}

/**
 * Resolve the project + SOW context for an invoice.
 *
 * Resolution path (in order):
 *   1. Direct: invoice.payment_installment_id → installment.payment_schedule_id
 *      → schedule.project_id and schedule.sow_document_id
 *   2. Fallback: invoice is a SOW deposit — sow_documents row where
 *      deposit_invoice_id = invoiceId
 *   3. Last-resort: parse "SOW SOW-XXX" from invoice.notes
 */
export async function getInvoiceProjectMeta(
  invoiceId: string,
): Promise<InvoiceProjectMeta> {
  // 1. Try installment → schedule path
  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select('payment_installment_id, prospect_id, notes')
    .eq('id', invoiceId)
    .maybeSingle()

  let projectId: string | null = null
  let sowDocId: string | null = null
  let scheduleId: string | null = null

  if (inv?.payment_installment_id) {
    const { data: inst } = await supabaseAdmin
      .from('payment_installments')
      .select('schedule_id')
      .eq('id', inv.payment_installment_id)
      .maybeSingle()
    if (inst?.schedule_id) {
      scheduleId = inst.schedule_id
      const { data: sched } = await supabaseAdmin
        .from('payment_schedules')
        .select('project_id, sow_document_id')
        .eq('id', inst.schedule_id)
        .maybeSingle()
      projectId = sched?.project_id ?? null
      sowDocId = sched?.sow_document_id ?? null
    }
  }

  // 2. Try SOW deposit path
  if (!projectId) {
    const { data: sow } = await supabaseAdmin
      .from('sow_documents')
      .select('id, sow_number')
      .eq('deposit_invoice_id', invoiceId)
      .maybeSingle()
    if (sow) {
      sowDocId = sow.id
      const { data: proj } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .eq('sow_document_id', sow.id)
        .maybeSingle()
      if (proj) projectId = proj.id
    }
  }

  // If we have a project but no schedule yet, try to find one via the project.
  if (!scheduleId && projectId) {
    const { data: sched } = await supabaseAdmin
      .from('payment_schedules')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (sched) scheduleId = sched.id
  }

  let name: string | null = null
  let sow_number: string | null = null

  if (projectId) {
    const { data: proj } = await supabaseAdmin
      .from('projects')
      .select('name, sow_document_id')
      .eq('id', projectId)
      .maybeSingle()
    name = proj?.name ?? null
    if (!sowDocId) sowDocId = proj?.sow_document_id ?? null
  }

  if (sowDocId) {
    const { data: sow } = await supabaseAdmin
      .from('sow_documents')
      .select('sow_number')
      .eq('id', sowDocId)
      .maybeSingle()
    sow_number = sow?.sow_number ?? null
  }

  // 3. Notes fallback for sow_number when nothing else matched
  if (!sow_number && inv?.notes) {
    const m = inv.notes.match(/SOW[-\s]([A-Z0-9-]+)/i)
    if (m) sow_number = m[1].startsWith('SOW-') ? m[1] : `SOW-${m[1]}`
  }

  // Project-level outstanding from payment schedule installments.
  let schedule_outstanding: ScheduleOutstanding | null = null
  if (scheduleId) {
    const { data: installments } = await supabaseAdmin
      .from('payment_installments')
      .select('amount_cents, amount_paid_cents, currency_type, status')
      .eq('schedule_id', scheduleId)

    if (installments && installments.length > 0) {
      let cash_paid_cents = 0
      let tik_paid_cents = 0
      let cash_remaining_cents = 0
      let tik_remaining_cents = 0
      for (const i of installments) {
        if (i.status === 'cancelled') continue
        const remaining = Math.max(0, i.amount_cents - i.amount_paid_cents)
        if (i.currency_type === 'tik') {
          tik_paid_cents += i.amount_paid_cents
          tik_remaining_cents += remaining
        } else {
          cash_paid_cents += i.amount_paid_cents
          cash_remaining_cents += remaining
        }
      }
      schedule_outstanding = {
        cash_paid_cents,
        tik_paid_cents,
        cash_remaining_cents,
        tik_remaining_cents,
        is_multi_installment: installments.length > 1,
      }
    }
  }

  return { name, sow_number, schedule_outstanding }
}
