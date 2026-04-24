// ── Shared invoice TypeScript types ─────────────────────────────────
// Also includes Trade-in-Kind (TIK) credit types.
// Used across admin API routes, public routes, Stripe sync, PDF rendering,
// and UI components. Single source of truth.

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'void'

export type InvoiceKind =
  | 'quote_driven'
  | 'business'
  | 'subscription_cycle'
  | 'restaurant_rule'

export type PaidMethod =
  | 'zero_balance'
  | 'check'
  | 'wire'
  | 'stripe'
  | 'other'
  | null

export type CategoryHint =
  | 'service_revenue'
  | 'marketing_expense'
  | 'research_credit'
  | 'subscription_revenue'
  | 'other'
  | null

export type SentViaChannel = 'manual' | 'email' | 'sms' | 'both' | null

export type DeliveryPreference = 'email_only' | 'sms_only' | 'both'

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  discount_pct: number
  discount_cents: number
  discount_label: string | null
  line_total_cents: number
  sort_order: number
}

export interface Invoice {
  id: string
  invoice_number: string
  public_uuid: string
  kind: InvoiceKind
  prospect_id: string | null
  quote_session_id: string | null
  subscription_id: string | null
  status: InvoiceStatus
  subtotal_cents: number
  discount_cents: number
  total_due_cents: number
  currency: string
  due_date: string | null
  paid_at: string | null
  paid_method: PaidMethod
  paid_note: string | null
  category_hint: CategoryHint
  sent_at: string | null
  sent_via_channel: SentViaChannel
  sent_via_email_to: string | null
  viewed_at: string | null
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
  supersedes_invoice_id: string | null
  superseded_by_invoice_id: string | null
  auto_generated: boolean
  auto_trigger: string | null
  auto_sent: boolean
  pdf_storage_path: string | null
  pdf_rendered_at: string | null
  pdf_version: number
  stripe_invoice_id: string | null
  stripe_payment_link_id: string | null
  stripe_payment_link_url: string | null
  public_viewed_count: number
  notes: string | null
  send_date: string | null
  late_fee_cents: number
  late_fee_grace_days: number
  late_fee_applied_at: string | null
  trade_credit_cents: number
  trade_credit_description: string | null
  trade_credit_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceBillTo {
  business_name: string
  contact_name: string | null
  email: string | null
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[]
  bill_to: InvoiceBillTo
  supersedes_number?: string | null
  superseded_by_number?: string | null
}

// ── Subscription types ─────────────────────────────────────────────

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'paused'

export type BillingInterval = 'month' | 'quarter' | 'year'

export interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  billing_interval: BillingInterval
  trial_days: number
  features: string[]
  stripe_product_id: string | null
  stripe_price_id: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  prospect_id: string
  plan_id: string
  status: SubscriptionStatus
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string
  current_period_end: string
  next_invoice_date: string
  canceled_at: string | null
  cancel_reason: string | null
  end_date: string | null
  notes: string | null
  override_monthly_amount_cents: number | null
  created_at: string
  updated_at: string
}

// ── SOW phases + cadence types ─────────────────────────────────────

export type Cadence = 'one_time' | 'monthly' | 'quarterly' | 'annual'

export interface SowPhaseStartTrigger {
  type: 'on_phase_complete' | 'date'
  phase_id?: string | null
  date?: string | null
}

export interface SowPhaseDeliverable {
  id: string
  service_id?: string | null
  name: string
  description: string
  cadence: Cadence
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number
  start_trigger?: SowPhaseStartTrigger
}

export interface SowPhase {
  id: string
  name: string
  description: string
  deliverables: SowPhaseDeliverable[]
}

// ── SOW types ──────────────────────────────────────────────────────

export type SowStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'void'

export interface SowDeliverable {
  name: string
  description: string
  acceptance_criteria?: string
  // Pricing per deliverable. For hourly items set hours + unit_price_cents
  // as the hourly rate. For fixed items set quantity=1, unit_price_cents=fee.
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number  // computed: (hours ?? quantity) * unit_price_cents
}

export interface SowTimelinePhase {
  name: string
  duration_weeks: number
  description: string
  deliverables?: string[]
}

export interface SowPricing {
  total_cents: number
  deposit_cents: number
  deposit_pct: number
  payment_schedule?: Array<{
    milestone: string
    amount_cents: number
    due_at: string
  }>
}

export interface SowOngoingServiceItem {
  service_id: string
  name: string
  quantity: number
  monthly_cents: number
}

export interface SowOngoingServices {
  plan_tier: 'essential' | 'growth' | 'full' | 'site_only'
  plan_name: string
  monthly_total_cents: number
  start_note: string  // e.g. "Activates on launch day"
  items: SowOngoingServiceItem[]
}

export interface SowDocument {
  id: string
  sow_number: string
  public_uuid: string
  prospect_id: string | null
  quote_session_id: string | null
  status: SowStatus
  title: string
  scope_summary: string | null
  phases: SowPhase[]  // new preferred shape; [] if still using legacy
  deliverables: SowDeliverable[]
  timeline: SowTimelinePhase[]
  pricing: SowPricing
  send_date?: string | null
  computed_from_deliverables?: boolean
  ongoing_services?: SowOngoingServices | null
  payment_terms: string | null
  guarantees: string | null
  notes: string | null
  pdf_storage_path: string | null
  pdf_rendered_at: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_signature: string | null
  accepted_ip: string | null
  declined_at: string | null
  decline_reason: string | null
  voided_at: string | null
  void_reason: string | null
  deposit_invoice_id: string | null
  trade_credit_cents?: number
  trade_credit_description?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Project phase types ────────────────────────────────────────────

export interface ProjectPhaseDeliverable {
  id: string
  service_id?: string | null
  name: string
  description: string
  cadence: 'one_time' | 'monthly' | 'quarterly' | 'annual'
  quantity?: number
  hours?: number
  unit_price_cents?: number
  line_total_cents?: number
  status: 'pending' | 'delivered'
  delivered_at?: string | null
}

export interface ProjectPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  completed_at?: string | null
  deliverables: ProjectPhaseDeliverable[]
}

export interface ProjectRow {
  id: string
  prospect_id: string
  deal_id: string | null
  sow_document_id: string | null
  name: string
  type: string
  status: string
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  monthly_value: number | null
  notes: string | null
  phases: ProjectPhase[]
  created_at: string
  updated_at: string
}

// ── Trade-in-Kind types ────────────────────────────────────────────

export type TradeCreditStatus = 'outstanding' | 'partial' | 'fulfilled' | 'written_off'

export interface TradeCredit {
  id: string
  prospect_id: string
  sow_document_id: string | null
  invoice_id: string | null
  original_amount_cents: number
  remaining_cents: number
  description: string
  status: TradeCreditStatus
  opened_at: string
  closed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TradeCreditDrawdown {
  id: string
  trade_credit_id: string
  amount_cents: number
  description: string
  delivered_on: string
  recorded_by: string | null
  notes: string | null
  created_at: string
}

// ── Stripe event log ───────────────────────────────────────────────

export interface StripeEventRecord {
  id: string
  stripe_event_id: string
  event_type: string
  processed_at: string
  payload: Record<string, unknown>
  processing_result: string | null
  error_message: string | null
}
