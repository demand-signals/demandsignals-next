// ── Payment plan TypeScript types ───────────────────────────────────
// Mirror of payment_schedules + payment_installments DB tables, plus
// the request/response contracts for the SOW conversion API.
// See docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md §5.

export type CurrencyType = 'cash' | 'tik'

export type ExpectedPaymentMethod =
  | 'card'
  | 'check'
  | 'wire'
  | 'ach'
  | 'unspecified'

export type TriggerType =
  | 'on_acceptance'
  | 'time'
  | 'milestone'
  | 'on_completion_of_payment'

export type InstallmentStatus =
  | 'pending'
  | 'invoice_issued'
  | 'partially_paid'
  | 'paid'
  | 'tik_open'
  | 'cancelled'

export interface PaymentSchedule {
  id: string
  sow_document_id: string
  project_id: string | null
  total_cents: number
  locked_at: string | null
  created_at: string
}

export interface PaymentInstallment {
  id: string
  schedule_id: string
  sequence: number
  amount_cents: number
  amount_paid_cents: number
  currency_type: CurrencyType
  expected_payment_method: ExpectedPaymentMethod | null
  trigger_type: TriggerType
  trigger_date: string | null
  trigger_milestone_id: string | null
  trigger_payment_id: string | null
  status: InstallmentStatus
  invoice_id: string | null
  trade_credit_id: string | null
  description: string | null
  fired_at: string | null
  created_at: string
}

// ── Conversion request body types ──────────────────────────────────

export interface ConvertSowAcceptance {
  signed_by: string
  accepted_at: string  // ISO date or full timestamp
  method: 'in_person' | 'phone' | 'email' | 'magic_link'
}

export interface ConvertSowAlreadyPaid {
  paid_date: string  // ISO date
  paid_method: 'check' | 'wire' | 'cash' | 'card' | 'ach' | 'other'
  reference?: string
}

export interface ConvertSowPaymentInstallmentSpec {
  sequence: number
  amount_cents: number
  currency_type: CurrencyType
  expected_payment_method?: ExpectedPaymentMethod
  trigger_type: TriggerType
  trigger_date?: string             // for trigger_type='time'
  trigger_milestone_id?: string     // for trigger_type='milestone'
  trigger_payment_sequence?: number // for trigger_type='on_completion_of_payment'; resolved server-side to ID
  description?: string
  already_paid?: ConvertSowAlreadyPaid
}

export interface ConvertSowSubscriptionSpec {
  deliverable_id: string  // refers to a SowPhaseDeliverable.id (or 'manual-…' if admin-added)
  amount_cents: number
  interval: 'month' | 'quarter' | 'year'
  start_date: string      // ISO date
  cycle_cap?: number      // null/undefined = open-ended
  already_activated?: boolean  // backfill: skip Stripe call
}

export interface ConvertSowTikSpec {
  amount_cents: number
  description: string
  trigger_type: 'on_acceptance' | 'milestone' | 'on_completion_of_payment'
  trigger_milestone_id?: string
  trigger_payment_sequence?: number
}

export interface ConvertSowRequest {
  acceptance: ConvertSowAcceptance
  payment_plan: ConvertSowPaymentInstallmentSpec[]
  subscriptions: ConvertSowSubscriptionSpec[]
  tik?: ConvertSowTikSpec
  send_invoices: boolean
  force?: boolean  // required when SOW status is declined/void
}

// ── Conversion response ────────────────────────────────────────────

export interface ConvertSowResult {
  project_id: string
  payment_schedule_id: string
  installments: Array<{
    id: string
    sequence: number
    status: InstallmentStatus
    invoice_id: string | null
    invoice_number: string | null
    public_url: string | null
  }>
  subscriptions: Array<{
    id: string
    stripe_subscription_id: string | null
    status: string
  }>
  trade_credit_id: string | null
}
