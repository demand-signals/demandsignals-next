// ── Stripe ↔ DSIG invoice sync ──────────────────────────────────────
// Creates Stripe Customers and Payment Links on demand.
// We host the invoice, Stripe handles payment collection.

import type Stripe from 'stripe'
import { stripe, idempotencyKey } from './stripe-client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { InvoiceWithLineItems } from './invoice-types'

/**
 * Get or create a Stripe Customer for a prospect.
 * Caches stripe_customer_id on the prospect row.
 */
export async function ensureStripeCustomer(prospectId: string): Promise<string> {
  const { data: prospect, error } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, owner_email, owner_phone, stripe_customer_id')
    .eq('id', prospectId)
    .single()

  if (error || !prospect) {
    throw new Error(`Prospect ${prospectId} not found: ${error?.message}`)
  }

  if (prospect.stripe_customer_id) {
    return prospect.stripe_customer_id
  }

  // Create new customer in Stripe.
  const customer = await stripe().customers.create(
    {
      name: prospect.business_name ?? undefined,
      email: prospect.owner_email ?? undefined,
      phone: prospect.owner_phone ?? undefined,
      metadata: {
        dsig_prospect_id: prospect.id,
      },
    },
    {
      idempotencyKey: idempotencyKey('customer', prospect.id),
    },
  )

  // Cache the customer ID on the prospect row.
  await supabaseAdmin
    .from('prospects')
    .update({ stripe_customer_id: customer.id })
    .eq('id', prospect.id)

  return customer.id
}

/**
 * Create or return a cached Stripe Payment Link for an invoice.
 * Only for non-subscription-cycle invoices (those go through Stripe
 * Invoicing directly). Uses inline line_items — no Stripe Product needed.
 *
 * Returns: { url, id } — the hosted Payment Link URL + Stripe's link ID.
 */
export async function ensurePaymentLink(
  invoice: InvoiceWithLineItems,
): Promise<{ url: string; id: string }> {
  if (invoice.total_due_cents <= 0) {
    throw new Error(`Cannot create Payment Link for zero-balance invoice ${invoice.invoice_number}`)
  }

  // Return cached link if present.
  if (invoice.stripe_payment_link_url && invoice.stripe_payment_link_id) {
    return {
      url: invoice.stripe_payment_link_url,
      id: invoice.stripe_payment_link_id,
    }
  }

  // Stripe Payment Links require at least one line item with a price_data.
  // Build a single-line summary — we collapse the DSIG line items into one
  // "Invoice DSIG-YYYY-NNNN" charge. (Stripe Payment Links support multi-line,
  // but our invoices are the canonical itemization; Stripe is just the till.)
  const s = stripe()

  // First create a one-off product + price for this invoice.
  const product = await s.products.create(
    {
      name: `Invoice ${invoice.invoice_number}`,
      metadata: {
        dsig_invoice_id: invoice.id,
        dsig_invoice_number: invoice.invoice_number,
      },
    },
    {
      idempotencyKey: idempotencyKey('product_for_invoice', invoice.id),
    },
  )

  const price = await s.prices.create(
    {
      product: product.id,
      unit_amount: invoice.total_due_cents,
      currency: invoice.currency.toLowerCase(),
    },
    {
      idempotencyKey: idempotencyKey('price_for_invoice', invoice.id),
    },
  )

  const link = await s.paymentLinks.create(
    {
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        dsig_invoice_id: invoice.id,
        dsig_invoice_number: invoice.invoice_number,
        dsig_kind: invoice.kind,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}?paid=1`,
        },
      },
    },
    {
      idempotencyKey: idempotencyKey('payment_link_for_invoice', invoice.id),
    },
  )

  // Cache on invoice row.
  await supabaseAdmin
    .from('invoices')
    .update({
      stripe_payment_link_id: link.id,
      stripe_payment_link_url: link.url,
    })
    .eq('id', invoice.id)

  return { url: link.url, id: link.id }
}

/**
 * Mark an invoice paid in response to a successful Stripe event.
 * Idempotent: if already paid, no-op.
 */
export async function markInvoicePaidFromStripe(
  invoiceId: string,
  options: { paymentMethod?: string; note?: string } = {},
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!current || current.status === 'paid' || current.status === 'void') {
    return
  }

  await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_method: options.paymentMethod ?? 'stripe',
      paid_note: options.note ?? 'Paid via Stripe',
    })
    .eq('id', invoiceId)
}

/**
 * Resolve a Stripe event to our invoice ID via metadata or cached IDs.
 * Returns null if no match.
 */
export async function findInvoiceForStripeEvent(
  event: Stripe.Event,
): Promise<string | null> {
  // Try metadata first (Payment Link / Checkout Session events).
  const obj = event.data.object as unknown as Record<string, unknown>
  const metadata = (obj.metadata ?? {}) as Record<string, string | undefined>
  if (metadata.dsig_invoice_id) {
    return metadata.dsig_invoice_id
  }

  // Fall back to stripe_invoice_id (set for subscription cycle invoices).
  const stripeInvoiceId =
    (obj.invoice as string | undefined) ?? // charge/payment_intent objects
    (obj.id as string | undefined) // invoice.* events

  if (stripeInvoiceId) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle()
    if (data) return data.id
  }

  // Payment Link ID fallback.
  const paymentLinkId = obj.payment_link as string | undefined
  if (paymentLinkId) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('stripe_payment_link_id', paymentLinkId)
      .maybeSingle()
    if (data) return data.id
  }

  return null
}
