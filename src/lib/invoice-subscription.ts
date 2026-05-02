// ── invoice-subscription.ts ─────────────────────────────────────────
// Set-and-forget subscription path for invoices with cadence (migration 043).
//
// Flow:
//   1. Admin creates invoice with mixed one-time + monthly/annual lines.
//   2. Admin clicks Send. /send route auto-fires email + SMS (existing).
//   3. Client opens magic link, clicks Pay → Stripe Payment Link.
//      The Payment Link is configured with setup_future_usage='off_session'
//      so the card is saved on the customer object after payment.
//   4. Stripe fires checkout.session.completed → webhook handler:
//      a. markInvoicePaidFromStripe (existing) → DSIG invoice marked paid,
//         receipt auto-generated.
//      b. createSubscriptionFromInvoice (NEW) → spin up a Stripe subscription
//         for months 2..N using the saved card. Subscription's
//         billing_cycle_anchor = today + 1 month so next charge is on the
//         same calendar day next cycle.
//   5. Each subsequent Stripe-driven cycle:
//      a. Stripe creates a sub-cycle invoice + charges the card.
//      b. Stripe fires invoice.paid → webhook calls
//         generateRecurringInvoiceFromSubscriptionCycle (NEW) which creates
//         a DSIG invoice + line items + receipt mirroring cycle 1 amounts.
//
// This is ALL automatic. Admin clicks Send once; card captured on first
// payment; Stripe runs the rest until the term is up (or until cancelled).

import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe, idempotencyKey } from '@/lib/stripe-client'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { createReceiptForInvoice } from '@/lib/stripe-sync'
import type { Invoice, InvoiceLineItem } from '@/lib/invoice-types'

interface InvoiceWithLines {
  invoice: Invoice & {
    term_months: number | null
    until_cancelled: boolean
    subscription_intent: 'none' | 'pending' | 'created'
    parent_subscription_id?: string | null
  }
  line_items: Array<InvoiceLineItem & { cadence: 'one_time' | 'monthly' | 'annual' }>
}

async function loadInvoiceWithLines(invoiceId: string): Promise<InvoiceWithLines | null> {
  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return null

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })

  return {
    invoice: invoice as InvoiceWithLines['invoice'],
    line_items: (lineItems ?? []) as InvoiceWithLines['line_items'],
  }
}

/**
 * Idempotent: if a subscription already exists for this invoice, returns
 * it without creating a duplicate. Called from the Stripe webhook when
 * checkout.session.completed fires for an invoice with
 * subscription_intent='pending'.
 *
 * The Stripe customer + saved payment method come from the just-completed
 * checkout (Payment Link with setup_future_usage='off_session').
 *
 * Returns null when invoice has no recurring lines (subscription_intent!='pending').
 */
export async function createSubscriptionFromInvoice(args: {
  invoiceId: string
  stripeCustomerId: string
}): Promise<{ subscription: Stripe.Subscription; dsigSubscriptionId: string } | null> {
  const data = await loadInvoiceWithLines(args.invoiceId)
  if (!data) return null
  const { invoice, line_items } = data

  if (invoice.subscription_intent !== 'pending') {
    // Either none (no recurring lines) or already created. No-op.
    return null
  }

  // Prevent duplicate subs from a webhook retry: if we already created one
  // for this invoice, return it.
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('parent_invoice_id', args.invoiceId)
    .maybeSingle()
  if (existing?.stripe_subscription_id) {
    const s = stripe()
    const sub = await s.subscriptions.retrieve(existing.stripe_subscription_id)
    return { subscription: sub, dsigSubscriptionId: existing.id }
  }

  // Group recurring lines by cadence — one Stripe subscription item per
  // (cadence, line_total) bucket would be possible but messy. Simpler:
  // collapse same-cadence lines into a single subscription item per
  // cadence, with the sum as the unit_amount. Each cycle bills that total.
  const monthlyTotal = line_items
    .filter((li) => li.cadence === 'monthly')
    .reduce((s, li) => s + (li.line_total_cents ?? 0), 0)
  const annualTotal = line_items
    .filter((li) => li.cadence === 'annual')
    .reduce((s, li) => s + (li.line_total_cents ?? 0), 0)

  if (monthlyTotal === 0 && annualTotal === 0) {
    // Defensive: subscription_intent='pending' but no recurring lines.
    // Reset and bail — this shouldn't happen in normal flow.
    await supabaseAdmin
      .from('invoices')
      .update({ subscription_intent: 'none' })
      .eq('id', args.invoiceId)
    return null
  }

  const s = stripe()

  // Build subscription items — one per cadence that has lines.
  const items: Stripe.SubscriptionCreateParams.Item[] = []
  if (monthlyTotal > 0) {
    const product = await s.products.create(
      {
        name: `Invoice ${invoice.invoice_number} — monthly`,
        metadata: {
          dsig_parent_invoice_id: invoice.id,
          dsig_parent_invoice_number: invoice.invoice_number,
          dsig_cadence: 'monthly',
        },
      },
      { idempotencyKey: idempotencyKey('product_for_inv_sub_monthly', invoice.id) },
    )
    const price = await s.prices.create(
      {
        product: product.id,
        unit_amount: monthlyTotal,
        currency: 'usd',
        recurring: { interval: 'month' },
      },
      { idempotencyKey: idempotencyKey('price_for_inv_sub_monthly', invoice.id) },
    )
    items.push({ price: price.id, quantity: 1 })
  }
  if (annualTotal > 0) {
    const product = await s.products.create(
      {
        name: `Invoice ${invoice.invoice_number} — annual`,
        metadata: {
          dsig_parent_invoice_id: invoice.id,
          dsig_parent_invoice_number: invoice.invoice_number,
          dsig_cadence: 'annual',
        },
      },
      { idempotencyKey: idempotencyKey('product_for_inv_sub_annual', invoice.id) },
    )
    const price = await s.prices.create(
      {
        product: product.id,
        unit_amount: annualTotal,
        currency: 'usd',
        recurring: { interval: 'year' },
      },
      { idempotencyKey: idempotencyKey('price_for_inv_sub_annual', invoice.id) },
    )
    items.push({ price: price.id, quantity: 1 })
  }

  // billing_cycle_anchor: cycle 1 was billed by the Payment Link just now.
  // Cycle 2 should fire one cycle from today. For mixed monthly+annual
  // we can't set a single anchor that satisfies both perfectly — Stripe
  // proration handles it. trial_end=N days from now means the FIRST
  // recurring charge happens N days out.
  //
  // Simplest accurate model: trial_end = today + 30 days (for monthly)
  // OR today + 365 days (for annual). When both exist, set trial_end on
  // each item separately is not supported — fall back to the shortest
  // cycle, which means an annual line will charge 30 days early on its
  // first cycle. That's a known compromise; admin can void-and-reissue
  // if it bites.
  const nowSec = Math.floor(Date.now() / 1000)
  const ONE_DAY = 86_400
  const trialEnd = nowSec + (monthlyTotal > 0 ? 30 * ONE_DAY : 365 * ONE_DAY)

  // Term enforcement: cancel_at = today + term_months * ~30 days for
  // finite terms. Stripe will let the sub run until that timestamp then
  // cancel. NULL term_months + until_cancelled=true → no cancel_at.
  let cancelAt: number | undefined
  if (!invoice.until_cancelled && invoice.term_months) {
    cancelAt = nowSec + invoice.term_months * 30 * ONE_DAY
  }

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: args.stripeCustomerId,
    items,
    collection_method: 'charge_automatically',
    trial_end: trialEnd,
    proration_behavior: 'none',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    metadata: {
      dsig_parent_invoice_id: invoice.id,
      dsig_parent_invoice_number: invoice.invoice_number,
    },
  }
  if (cancelAt) subscriptionParams.cancel_at = cancelAt

  const subscription = await s.subscriptions.create(subscriptionParams, {
    idempotencyKey: idempotencyKey('inv_subscription', invoice.id),
  })

  // Persist a DSIG subscriptions row so admin can see it. plan_id is
  // null per migration 043 (invoice-driven subs don't use the
  // subscription_plans catalog).
  const firstItem = subscription.items?.data?.[0]
  const periodStartTs = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : new Date(trialEnd * 1000).toISOString()
  const periodEndTs = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : new Date(
        (trialEnd + (monthlyTotal > 0 ? 30 : 365) * ONE_DAY) * 1000,
      ).toISOString()
  const nextInvoiceDate = periodEndTs.slice(0, 10)

  const { data: dsigSub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      prospect_id: invoice.prospect_id,
      plan_id: null,
      parent_invoice_id: invoice.id,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
      stripe_subscription_id: subscription.id,
      stripe_customer_id: args.stripeCustomerId,
      current_period_start: periodStartTs,
      current_period_end: periodEndTs,
      next_invoice_date: nextInvoiceDate,
    })
    .select('id')
    .single()

  if (subErr) {
    console.error('[createSubscriptionFromInvoice] subscriptions insert failed:', subErr.message)
  }

  // Flip the invoice's subscription_intent to 'created' + stamp the link.
  await supabaseAdmin
    .from('invoices')
    .update({
      subscription_intent: 'created',
      subscription_id: dsigSub?.id ?? null,
    })
    .eq('id', invoice.id)

  return { subscription, dsigSubscriptionId: dsigSub?.id ?? '' }
}

/**
 * Called from the Stripe webhook when invoice.paid fires for a subscription
 * cycle invoice (months 2..N). Creates a DSIG invoice + line items +
 * receipt mirroring cycle 1's amounts, attributed to the parent invoice's
 * prospect + linked to the dsig subscription row.
 *
 * Looks up the parent DSIG invoice via Stripe subscription metadata
 * (set in createSubscriptionFromInvoice). If the parent can't be found
 * (e.g. SOW-driven sub from before migration 043), returns null and the
 * webhook falls through to its existing handler.
 *
 * Returns the new DSIG invoice id, or null if not applicable.
 */
export async function generateRecurringInvoiceFromSubscriptionCycle(
  stripeInvoice: Stripe.Invoice,
): Promise<string | null> {
  const subId = (stripeInvoice as unknown as { subscription?: string }).subscription
  if (!subId) return null

  const s = stripe()
  const stripeSub = await s.subscriptions.retrieve(subId)
  const parentInvoiceId = stripeSub.metadata?.dsig_parent_invoice_id
  if (!parentInvoiceId) return null

  // Idempotency — if we've already created a DSIG invoice for this Stripe
  // cycle invoice, skip.
  if (stripeInvoice.id) {
    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoice.id)
      .maybeSingle()
    if (existing) return existing.id
  }

  const parent = await loadInvoiceWithLines(parentInvoiceId)
  if (!parent) return null

  const { data: dsigSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle()

  // Recurring lines only — that's all the Stripe cycle bills.
  const recurringLines = parent.line_items.filter((li) => li.cadence !== 'one_time')
  const cycleTotalCents = (stripeInvoice.amount_paid ?? stripeInvoice.amount_due ?? 0) as number

  // Allocate a fresh DSIG invoice number per cycle.
  const tempNumber = `PENDING-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  const { data: newInv, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempNumber,
      kind: 'subscription_cycle',
      prospect_id: parent.invoice.prospect_id,
      subscription_id: dsigSub?.id ?? null,
      stripe_invoice_id: stripeInvoice.id,
      status: 'paid',
      sent_at: now,
      paid_at: now,
      paid_method: 'stripe',
      paid_note: `Stripe subscription cycle ${stripeInvoice.id} for parent invoice ${parent.invoice.invoice_number}`,
      sent_via_channel: 'manual',
      auto_generated: true,
      auto_trigger: 'subscription_cycle',
      auto_sent: true,
      subtotal_cents: cycleTotalCents,
      discount_cents: 0,
      total_due_cents: cycleTotalCents,
      currency: 'USD',
      category_hint: 'subscription_revenue',
      notes: `Recurring cycle from invoice ${parent.invoice.invoice_number}`,
      // No cadence on cycle invoices — they're a snapshot of one cycle.
      subscription_intent: 'none',
    })
    .select('*')
    .single()

  if (invErr || !newInv) {
    console.error('[generateRecurringInvoiceFromSubscriptionCycle] invoice insert failed:', invErr?.message)
    return null
  }

  if (parent.invoice.prospect_id) {
    try {
      const num = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id: parent.invoice.prospect_id,
        ref_table: 'invoices',
        ref_id: newInv.id,
      })
      await supabaseAdmin.from('invoices').update({ invoice_number: num }).eq('id', newInv.id)
      newInv.invoice_number = num
    } catch (e) {
      console.warn('[generateRecurringInvoiceFromSubscriptionCycle] number allocation:', e)
    }
  }

  // Recreate the recurring line items as one-time on this cycle invoice
  // (each cycle is a snapshot of the recurring portion at full per-cycle price).
  const lineRows = recurringLines.map((li, idx) => ({
    invoice_id: newInv.id,
    description: `${li.description} (${li.cadence === 'annual' ? 'annual' : 'monthly'} cycle)`,
    quantity: li.quantity,
    unit_price_cents: li.unit_price_cents,
    subtotal_cents: li.quantity * li.unit_price_cents,
    discount_pct: 0,
    discount_cents: 0,
    line_total_cents: li.line_total_cents,
    sort_order: idx,
    cadence: 'one_time', // each cycle is a one-time slice
  }))
  if (lineRows.length > 0) {
    const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineRows)
    if (liErr) {
      console.error('[generateRecurringInvoiceFromSubscriptionCycle] line items insert:', liErr.message)
    }
  }

  // Auto-receipt — Stripe already collected the money.
  if (parent.invoice.prospect_id) {
    await createReceiptForInvoice({
      invoiceId: newInv.id,
      prospectId: parent.invoice.prospect_id,
      amountCents: cycleTotalCents,
      paymentMethod: 'stripe',
      paymentReference: stripeInvoice.id ?? null,
      notes: `Auto-charged subscription cycle for ${parent.invoice.invoice_number}`,
    })
  }

  // Best-effort PDF render so the magic-link / email-attached PDF works.
  try {
    const { regenerateInvoicePdf } = await import('./invoice-pdf-regenerate')
    await regenerateInvoicePdf(newInv.id)
  } catch {
    /* non-fatal */
  }

  return newInv.id
}
