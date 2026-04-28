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
      customer_creation: 'always',
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: {
          dsig_invoice_id: invoice.id,
          dsig_invoice_number: invoice.invoice_number,
        },
      },
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
 * Idempotent: if already paid or void, no-op. Supports partial payments —
 * if amountCents < total_due_cents, status stays 'sent'/'viewed' and a
 * receipt is still created for the partial amount.
 */
export async function markInvoicePaidFromStripe(
  invoiceId: string,
  options: {
    paymentMethod?: string
    note?: string
    amountCents?: number
    paymentReference?: string | null
  } = {},
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from('invoices')
    .select('id, status, total_due_cents, prospect_id')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!current || current.status === 'paid' || current.status === 'void') {
    return
  }

  const amountCents = options.amountCents ?? current.total_due_cents
  const isFullPayment = amountCents >= current.total_due_cents
  const newStatus = isFullPayment ? 'paid' : current.status
  const paymentMethod = options.paymentMethod ?? 'stripe'

  await supabaseAdmin
    .from('invoices')
    .update({
      status: newStatus,
      ...(isFullPayment
        ? {
            paid_at: new Date().toISOString(),
            paid_method: paymentMethod,
            paid_note: options.note ?? 'Paid via Stripe',
          }
        : {}),
    })
    .eq('id', invoiceId)

  if (current.prospect_id) {
    await createReceiptForInvoice({
      invoiceId,
      prospectId: current.prospect_id,
      amountCents,
      paymentMethod,
      paymentReference: options.paymentReference ?? null,
      notes: options.note ?? null,
    })
  }
}

// ── Auto-issue RCT receipt for a paid invoice ───────────────────────
// Mirrors the receipt-creation block in /api/admin/invoices/[id]/mark-paid.
// Idempotent: if a receipt already exists for this invoice with the same
// amount + payment_method, skips creation.
//
// Best-effort: failures are logged but never thrown. The invoice is already
// marked paid; missing a receipt is a recoverable state (admin can re-create
// from the admin UI later).
export async function createReceiptForInvoice(args: {
  invoiceId: string
  prospectId: string
  amountCents: number
  paymentMethod: string
  paymentReference?: string | null
  notes?: string | null
}): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('receipts')
    .select('id')
    .eq('invoice_id', args.invoiceId)
    .eq('amount_cents', args.amountCents)
    .eq('payment_method', args.paymentMethod)
    .limit(1)
    .maybeSingle()
  if (existing) return

  const tempRct = `PENDING-${crypto.randomUUID()}`
  const { data: rctRow, error: rctErr } = await supabaseAdmin
    .from('receipts')
    .insert({
      receipt_number: tempRct,
      invoice_id: args.invoiceId,
      prospect_id: args.prospectId,
      amount_cents: args.amountCents,
      currency: 'USD',
      payment_method: args.paymentMethod,
      payment_reference: args.paymentReference ?? null,
      paid_at: new Date().toISOString(),
      notes: args.notes ?? null,
    })
    .select('id')
    .single()

  if (rctErr || !rctRow) {
    console.error('[createReceiptForInvoice] insert failed:', rctErr?.message)
    return
  }

  let receiptNumber = tempRct
  try {
    const { allocateDocNumber } = await import('./doc-numbering')
    const rctNumber = await allocateDocNumber({
      doc_type: 'RCT',
      prospect_id: args.prospectId,
      ref_table: 'receipts',
      ref_id: rctRow.id,
    })
    const { error: renameErr } = await supabaseAdmin
      .from('receipts')
      .update({ receipt_number: rctNumber })
      .eq('id', rctRow.id)
    if (renameErr) {
      console.error('[createReceiptForInvoice] rename failed:', renameErr.message)
    } else {
      receiptNumber = rctNumber
    }
  } catch (numErr) {
    console.error('[createReceiptForInvoice] numbering failed:', numErr instanceof Error ? numErr.message : numErr)
    // Receipt remains as PENDING-… — visible in admin and fixable manually.
  }

  // ── Notify the customer that payment was received ──
  // Best-effort. Honors email_delivery_enabled + sms_delivery_enabled
  // kill switches. Failures here never break the webhook handler that
  // called us (the receipt + invoice-paid state are already committed).
  try {
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, prospect:prospects(business_name, owner_name, owner_email, business_email, owner_phone, business_phone)')
      .eq('id', args.invoiceId)
      .maybeSingle()

    if (invoice && invoice.prospect) {
      const prospect = invoice.prospect as unknown as {
        business_name?: string
        owner_name?: string | null
        owner_email?: string | null
        business_email?: string | null
        owner_phone?: string | null
        business_phone?: string | null
      }
      const recipientEmail = prospect.owner_email ?? prospect.business_email ?? null
      const recipientPhone = prospect.owner_phone ?? prospect.business_phone ?? null
      const amountStr = `$${(args.amountCents / 100).toFixed(2)}`

      // Email — receipt confirmation
      if (recipientEmail) {
        try {
          const { sendReceiptEmail } = await import('./receipt-email')
          const r = await sendReceiptEmail(
            {
              id: rctRow.id,
              receipt_number: receiptNumber,
              invoice_id: args.invoiceId,
              amount_cents: args.amountCents,
              currency: 'USD',
              payment_method: args.paymentMethod,
              payment_reference: args.paymentReference ?? null,
              paid_at: new Date().toISOString(),
              prospect_id: args.prospectId,
            },
            invoice.invoice_number,
            recipientEmail,
            { business_name: prospect.business_name, owner_name: prospect.owner_name },
          )
          if (!r.success) console.error('[createReceiptForInvoice] receipt email failed:', r.error)
        } catch (e) {
          console.error('[createReceiptForInvoice] receipt email threw:', e instanceof Error ? e.message : e)
        }
      }

      // SMS — short payment confirmation
      if (recipientPhone) {
        try {
          const { sendSms, isSmsEnabled } = await import('./twilio-sms')
          if (await isSmsEnabled()) {
            const businessName = prospect.business_name ?? 'your business'
            const message =
              `${businessName}: Payment of ${amountStr} received for invoice ${invoice.invoice_number}. ` +
              `Receipt ${receiptNumber}. Thank you — Demand Signals.`
            const r = await sendSms(recipientPhone, message)
            if (!r.success) console.error('[createReceiptForInvoice] receipt SMS failed:', r.error)
          }
        } catch (e) {
          console.error('[createReceiptForInvoice] receipt SMS threw:', e instanceof Error ? e.message : e)
        }
      }
    }
  } catch (notifyErr) {
    console.error('[createReceiptForInvoice] notify pipeline threw:', notifyErr instanceof Error ? notifyErr.message : notifyErr)
  }
}

/**
 * Refund a Stripe payment. Issues a Stripe Refund against the original
 * payment_intent (preferred) or charge id stored on the invoice.
 *
 * Returns the Stripe refund object on success. Throws on Stripe error so
 * callers can decide whether to fall back to a manual refund.
 *
 * Idempotency: pass `idempotencyKey` (recommended: dsig_refund_<credit_memo_id>)
 * so retries don't double-refund.
 */
export async function createStripeRefund(args: {
  invoiceId: string
  amountCents: number
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  idempotencyKey?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Refund> {
  const { invoiceId, amountCents, reason, idempotencyKey, metadata } = args

  // Resolve the original payment id. The receipt row carries the
  // payment_intent id in payment_reference for stripe-paid invoices.
  const { data: receipt } = await supabaseAdmin
    .from('receipts')
    .select('payment_reference, payment_method')
    .eq('invoice_id', invoiceId)
    .eq('payment_method', 'stripe')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!receipt?.payment_reference) {
    throw new Error(
      'Cannot Stripe-refund: no stripe receipt with a payment_intent reference found for this invoice',
    )
  }

  const paymentIntentId = receipt.payment_reference
  if (!paymentIntentId.startsWith('pi_')) {
    throw new Error(
      `Receipt payment_reference is not a Stripe payment_intent (got "${paymentIntentId.slice(0, 6)}…")`,
    )
  }

  const refund = await stripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason: reason ?? 'requested_by_customer',
      metadata: metadata ?? {},
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  )
  return refund
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
