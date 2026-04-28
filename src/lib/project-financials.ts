// ── project-financials.ts ─────────────────────────────────────────────
// Aggregates a project's invoices, receipts, and active subscriptions for
// admin display. Resolves the project's invoice set via two paths:
//   1. payment_schedule.project_id → installment.invoice_id  (modern path)
//   2. sow_documents.id == project.sow_document_id → deposit_invoice_id  (legacy/deposit path)
// Both paths are unioned and de-duplicated by invoice id.
//
// Subscription rollup uses the prospect_id (subscriptions are
// prospect-scoped, not project-scoped — a single prospect can have one
// build project + one hosting/retainer subscription that funds it).

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ProjectInvoiceLite {
  id: string
  invoice_number: string
  status: string
  total_due_cents: number
  paid_at: string | null
  send_date: string | null
  kind: string
}

export interface ProjectReceiptLite {
  id: string
  receipt_number: string
  invoice_id: string
  amount_cents: number
  payment_method: string
  paid_at: string
}

export interface ProjectSubscriptionLite {
  id: string
  status: string
  monthly_value_cents: number
  next_invoice_date: string | null
  plan_name: string | null
}

export interface ProjectFinancials {
  invoices: ProjectInvoiceLite[]
  receipts: ProjectReceiptLite[]
  subscriptions: ProjectSubscriptionLite[]
  /** Sum of active subscription monthly equivalents in cents. */
  active_monthly_cents: number
  /** Sum of paid invoice amounts in cents (across cash + tik). */
  total_invoiced_cents: number
  total_paid_cents: number
}

const ACTIVE_SUB_STATUSES = ['active', 'trialing']

export async function getProjectFinancials(args: {
  projectId: string
  prospectId: string
  sowDocumentId?: string | null
}): Promise<ProjectFinancials> {
  const { projectId, prospectId, sowDocumentId } = args

  // ── 1. Invoice ids via payment schedule path ──
  const invoiceIdSet = new Set<string>()
  const { data: schedules } = await supabaseAdmin
    .from('payment_schedules')
    .select('id')
    .eq('project_id', projectId)
  const scheduleIds = (schedules ?? []).map((s) => s.id)
  if (scheduleIds.length > 0) {
    const { data: insts } = await supabaseAdmin
      .from('payment_installments')
      .select('invoice_id')
      .in('schedule_id', scheduleIds)
      .not('invoice_id', 'is', null)
    for (const i of insts ?? []) {
      if (i.invoice_id) invoiceIdSet.add(i.invoice_id)
    }
  }

  // ── 2. Invoice ids via SOW deposit path ──
  if (sowDocumentId) {
    const { data: sow } = await supabaseAdmin
      .from('sow_documents')
      .select('deposit_invoice_id')
      .eq('id', sowDocumentId)
      .maybeSingle()
    if (sow?.deposit_invoice_id) invoiceIdSet.add(sow.deposit_invoice_id)
  }

  // ── 3. Hydrate invoice rows ──
  let invoices: ProjectInvoiceLite[] = []
  if (invoiceIdSet.size > 0) {
    const { data: invs } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, status, total_due_cents, paid_at, send_date, kind')
      .in('id', Array.from(invoiceIdSet))
      .order('send_date', { ascending: false, nullsFirst: false })
    invoices = invs ?? []
  }

  // ── 4. Receipts for those invoices ──
  let receipts: ProjectReceiptLite[] = []
  if (invoices.length > 0) {
    const { data: rcs } = await supabaseAdmin
      .from('receipts')
      .select('id, receipt_number, invoice_id, amount_cents, payment_method, paid_at')
      .in('invoice_id', invoices.map((i) => i.id))
      .order('paid_at', { ascending: false })
    receipts = rcs ?? []
  }

  // ── 5. Subscriptions on the prospect ──
  const { data: subRows } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      id, status, current_period_start, current_period_end, next_invoice_date,
      override_monthly_amount_cents,
      plan:subscription_plans ( name, price_cents, billing_interval )
    `)
    .eq('prospect_id', prospectId)

  const subscriptions: ProjectSubscriptionLite[] = (subRows ?? []).map((s: any) => {
    // Compute monthly equivalent: override wins; else convert plan price by interval.
    let monthly = s.override_monthly_amount_cents ?? 0
    if (!monthly && s.plan) {
      const price = s.plan.price_cents ?? 0
      const interval = s.plan.billing_interval ?? 'month'
      if (interval === 'month') monthly = price
      else if (interval === 'quarter') monthly = Math.round(price / 3)
      else if (interval === 'year') monthly = Math.round(price / 12)
    }
    return {
      id: s.id,
      status: s.status,
      monthly_value_cents: monthly,
      next_invoice_date: s.next_invoice_date,
      plan_name: s.plan?.name ?? null,
    }
  })

  const active_monthly_cents = subscriptions
    .filter((s) => ACTIVE_SUB_STATUSES.includes(s.status))
    .reduce((sum, s) => sum + s.monthly_value_cents, 0)

  const total_invoiced_cents = invoices.reduce((s, i) => s + i.total_due_cents, 0)
  const total_paid_cents = receipts.reduce((s, r) => s + r.amount_cents, 0)

  return {
    invoices,
    receipts,
    subscriptions,
    active_monthly_cents,
    total_invoiced_cents,
    total_paid_cents,
  }
}
