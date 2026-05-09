// POST /api/admin/subscriptions/[id]/retry-stripe
//
// Retry the Stripe subscription creation for a DSIG subscriptions row
// whose original creation failed (stripe_subscription_id IS NULL,
// usually with an error captured in `notes`).
//
// Triggered manually from the admin subscription detail page when the
// row's `notes` shows STRIPE ERROR — typically because the API key
// was bad/wrong at the time of original create.
//
// Idempotent in the sense that we refuse to act on rows that already
// have a stripe_subscription_id. If the underlying create call
// idempotency keys (per createStripeSubscription) collide with a
// prior partial run, Stripe handles the dedup.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createStripeSubscription } from '@/lib/stripe-subscriptions'
import { isStripeEnabled, stripe } from '@/lib/stripe-client'

// Search Stripe for any customer tagged with this prospect_id in metadata
// that has a default_payment_method or attached payment source. Returns
// the customer ID, or null if no payment-bearing customer is found.
//
// Why this exists: Payment Links are created with customer_creation:'always',
// which spawns a fresh Stripe customer at checkout time. The platform's
// ensureStripeCustomer pre-stamps a different (empty) customer on the
// prospect row before the link is generated. Result: the saved card lives
// on customer A, the platform points at customer B, and any subsequent
// subscription create fails with "no attached payment source."
//
// This helper queries Stripe for all customers with metadata.dsig_prospect_id
// matching the prospect, picks the one with a saved card, and returns its ID
// so the caller can reconcile the prospects.stripe_customer_id pointer.
async function findCustomerWithPaymentMethod(
  prospectId: string,
): Promise<string | null> {
  const s = stripe()

  // Stripe's search API supports metadata: 'metadata["key"]:"value"'.
  // Limit to the most recent matches; in practice there are 1-2.
  const results = await s.customers.search({
    query: `metadata["dsig_prospect_id"]:"${prospectId}"`,
    limit: 20,
  })

  for (const c of results.data) {
    if (c.deleted) continue
    if (c.invoice_settings?.default_payment_method) return c.id
    // Fall back to listing payment methods on the customer.
    const pms = await s.paymentMethods.list({ customer: c.id, limit: 1 })
    if (pms.data.length > 0) return c.id
  }
  return null
}

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  // Check kill switch
  if (!(await isStripeEnabled())) {
    return NextResponse.json(
      { error: 'Stripe is disabled at the kill-switch (quote_config.stripe_enabled)' },
      { status: 400 },
    )
  }

  // Load the row
  const { data: sub, error: loadErr } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      id, prospect_id, status, override_monthly_amount_cents,
      current_period_start, current_period_end,
      stripe_subscription_id,
      cycle_cap,
      plan:subscription_plans ( name, price_cents, billing_interval )
    `)
    .eq('id', id)
    .maybeSingle()

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  if (sub.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'Subscription already has a stripe_subscription_id; nothing to retry' },
      { status: 409 },
    )
  }

  // Resolve the price + interval. Prefer override → plan.
  const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan
  const amountCents = sub.override_monthly_amount_cents ?? plan?.price_cents ?? 0
  if (amountCents <= 0) {
    return NextResponse.json(
      { error: 'Cannot retry: amount_cents is 0 (no override and no plan price)' },
      { status: 400 },
    )
  }
  const billingInterval = plan?.billing_interval ?? 'month'
  const interval: 'month' | 'quarter' | 'year' =
    billingInterval === 'quarter'
      ? 'quarter'
      : billingInterval === 'year'
        ? 'year'
        : 'month'

  const startDateISO = sub.current_period_start ?? new Date().toISOString()
  const productName = plan?.name ?? 'Custom subscription'

  // Helper that runs createStripeSubscription once and returns either
  // the success payload or a parsed error string.
  async function attemptCreate(): Promise<
    | { ok: true; result: Awaited<ReturnType<typeof createStripeSubscription>> }
    | { ok: false; error: string }
  > {
    try {
      const result = await createStripeSubscription({
        dsigSubscriptionId: sub!.id,
        prospectId: sub!.prospect_id,
        amountCents,
        interval,
        startDateISO,
        cycleCap: sub!.cycle_cap ?? undefined,
        productName,
      })
      return { ok: true, result }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  // First attempt
  let outcome = await attemptCreate()

  // If the failure is "no attached payment source," it usually means the
  // prospect's stripe_customer_id is pointing at the wrong customer (the
  // empty one ensureStripeCustomer pre-stamped vs. the Payment-Link-created
  // one with the saved card). Search Stripe for the right customer and
  // reconcile, then retry once.
  let reconciledCustomerId: string | null = null
  if (
    !outcome.ok &&
    /no attached payment source|no default payment method/i.test(outcome.error)
  ) {
    try {
      const found = await findCustomerWithPaymentMethod(sub.prospect_id)
      if (found) {
        await supabaseAdmin
          .from('prospects')
          .update({ stripe_customer_id: found })
          .eq('id', sub.prospect_id)
        reconciledCustomerId = found
        outcome = await attemptCreate()
      }
    } catch (searchErr) {
      console.error(
        '[retry-stripe] customer reconciliation search failed:',
        searchErr instanceof Error ? searchErr.message : searchErr,
      )
    }
  }

  if (!outcome.ok) {
    // Capture the (final) error to notes so admin can see what happened.
    await supabaseAdmin
      .from('subscriptions')
      .update({
        notes: `RETRY STRIPE ERROR (${new Date().toISOString()}): ${outcome.error}` +
          (reconciledCustomerId
            ? ` [reconciled customer to ${reconciledCustomerId}; still failed]`
            : ''),
      })
      .eq('id', sub.id)
    return NextResponse.json({ error: outcome.error }, { status: 502 })
  }

  // Success — write the now-real Stripe identifiers + clear notes.
  await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: outcome.result.subscription.id,
      stripe_customer_id: outcome.result.customerId,
      status: outcome.result.subscription.status === 'trialing' ? 'trialing' : 'active',
      end_date: outcome.result.endDate,
      notes: null,
    })
    .eq('id', sub.id)

  return NextResponse.json({
    ok: true,
    stripe_subscription_id: outcome.result.subscription.id,
    stripe_customer_id: outcome.result.customerId,
    status: outcome.result.subscription.status,
    reconciled_customer: reconciledCustomerId,
  })
}
