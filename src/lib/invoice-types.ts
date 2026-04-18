// ── Shared invoice TypeScript types ─────────────────────────────────
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
  created_at: string
  updated_at: string
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

export interface SowDocument {
  id: string
  sow_number: string
  public_uuid: string
  prospect_id: string | null
  quote_session_id: string | null
  status: SowStatus
  title: string
  scope_summary: string | null
  deliverables: SowDeliverable[]
  timeline: SowTimelinePhase[]
  pricing: SowPricing
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
  created_by: string | null
  created_at: string
  updated_at: string
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
