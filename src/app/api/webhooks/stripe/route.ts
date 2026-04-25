// ── POST /api/webhooks/stripe ───────────────────────────────────────
// Stripe webhook handler with signature verification + idempotency.
//
// Stripe sends events for: payment_intent.succeeded, checkout.session.completed,
// invoice.paid, invoice.payment_failed, customer.subscription.updated,
// customer.subscription.deleted, etc.
//
// Every event is recorded in stripe_events (UNIQUE stripe_event_id).
// Duplicate deliveries are safe — they no-op after the UNIQUE check.
//
// Required env vars:
//   STRIPE_API_KEY          (for Stripe SDK)
//   STRIPE_WEBHOOK_SECRET   (for signature verification; until set, returns 503)

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import {
  stripe,
  isWebhookConfigured,
  getWebhookSigningSecret,
  recordStripeEvent,
} from '@/lib/stripe-client'
import {
  findInvoiceForStripeEvent,
  markInvoicePaidFromStripe,
} from '@/lib/stripe-sync'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  if (!isWebhookConfigured()) {
    return NextResponse.json(
      { error: 'Stripe webhook signing secret not configured' },
      { status: 503 },
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      getWebhookSigningSecret(),
    )
  } catch (e) {
    return NextResponse.json(
      { error: `Signature verification failed: ${e instanceof Error ? e.message : e}` },
      { status: 400 },
    )
  }

  // Idempotency: record the event; if already seen, short-circuit.
  const { alreadyProcessed } = await recordStripeEvent(event)
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  // Dispatch by event type.
  try {
    await handleEvent(event)
    await supabaseAdmin
      .from('stripe_events')
      .update({ processing_result: 'success' })
      .eq('stripe_event_id', event.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabaseAdmin
      .from('stripe_events')
      .update({ processing_result: 'error', error_message: msg })
      .eq('stripe_event_id', event.id)
    // Return 200 anyway — Stripe will retry if we return non-2xx.
    // We store the error and will re-process manually if needed.
    return NextResponse.json({ received: true, error: msg }, { status: 200 })
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded': {
      const invoiceId = await findInvoiceForStripeEvent(event)
      if (invoiceId) {
        // Extract amount: checkout sessions use amount_total (cents),
        // payment_intents use amount_received.
        const obj = event.data.object as unknown as Record<string, unknown>
        const amountCents =
          (obj.amount_total as number | undefined) ??
          (obj.amount_received as number | undefined) ??
          undefined
        const reference = (obj.id as string | undefined) ?? null
        await markInvoicePaidFromStripe(invoiceId, {
          paymentMethod: 'stripe',
          amountCents,
          paymentReference: reference,
          note: `Stripe ${event.type} ${event.id}`,
        })

        // Plan B cascade: if this invoice is linked to a payment_installment,
        // mark the installment paid → fires any on_completion_of_payment dependents.
        const { findInstallmentForInvoice, markInstallmentPaid } = await import('@/lib/payment-plans')
        const installmentId = await findInstallmentForInvoice(invoiceId)
        if (installmentId && amountCents) {
          await markInstallmentPaid(installmentId, amountCents)
        }
      }
      return
    }

    case 'invoice.paid': {
      // Subscription cycle invoice marked paid by Stripe.
      const invoiceId = await findInvoiceForStripeEvent(event)
      if (invoiceId) {
        const obj = event.data.object as unknown as Record<string, unknown>
        const amountCents = (obj.amount_paid as number | undefined) ?? undefined
        const reference = (obj.id as string | undefined) ?? null
        await markInvoicePaidFromStripe(invoiceId, {
          paymentMethod: 'stripe',
          amountCents,
          paymentReference: reference,
          note: `Stripe invoice.paid ${event.id}`,
        })
      }
      return
    }

    case 'invoice.payment_failed': {
      const invoiceId = await findInvoiceForStripeEvent(event)
      if (invoiceId) {
        // Mark the underlying subscription past_due, but leave invoice sent.
        const { data: inv } = await supabaseAdmin
          .from('invoices')
          .select('subscription_id')
          .eq('id', invoiceId)
          .maybeSingle()
        if (inv?.subscription_id) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', inv.subscription_id)
        }
      }
      return
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // Newer Stripe SDK: current_period_* lives on subscription items, not
      // the subscription itself. Use the first item's periods.
      const firstItem = sub.items?.data?.[0]
      const updates: Record<string, unknown> = {
        status: mapStripeSubStatus(sub.status),
      }
      if (firstItem?.current_period_start) {
        updates.current_period_start = new Date(
          firstItem.current_period_start * 1000,
        ).toISOString()
      }
      if (firstItem?.current_period_end) {
        updates.current_period_end = new Date(
          firstItem.current_period_end * 1000,
        ).toISOString()
      }
      await supabaseAdmin
        .from('subscriptions')
        .update(updates)
        .eq('stripe_subscription_id', sub.id)
      return
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancel_reason: sub.cancellation_details?.reason ?? 'stripe_deleted',
        })
        .eq('stripe_subscription_id', sub.id)
      return
    }

    case 'customer.subscription.paused': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'paused' })
        .eq('stripe_subscription_id', sub.id)
      return
    }

    case 'customer.subscription.resumed': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'active', paused_until: null })
        .eq('stripe_subscription_id', sub.id)
      return
    }

    default:
      // Silently acknowledge events we don't care about.
      return
  }
}

function mapStripeSubStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'paused':
    case 'canceled':
      return stripeStatus
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'past_due'
    default:
      return 'active'
  }
}
