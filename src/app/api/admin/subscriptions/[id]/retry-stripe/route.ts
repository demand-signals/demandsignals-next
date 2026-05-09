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
import { isStripeEnabled } from '@/lib/stripe-client'

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

  try {
    const result = await createStripeSubscription({
      dsigSubscriptionId: sub.id,
      prospectId: sub.prospect_id,
      amountCents,
      interval,
      startDateISO,
      cycleCap: sub.cycle_cap ?? undefined,
      productName,
    })

    // Update the DSIG row with the now-real Stripe identifiers + clear
    // the prior STRIPE ERROR note.
    await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_subscription_id: result.subscription.id,
        stripe_customer_id: result.customerId,
        status: result.subscription.status === 'trialing' ? 'trialing' : 'active',
        end_date: result.endDate,
        notes: null,
      })
      .eq('id', sub.id)

    return NextResponse.json({
      ok: true,
      stripe_subscription_id: result.subscription.id,
      stripe_customer_id: result.customerId,
      status: result.subscription.status,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // Capture the new error to notes so admin can see what happened.
    await supabaseAdmin
      .from('subscriptions')
      .update({
        notes: `RETRY STRIPE ERROR (${new Date().toISOString()}): ${message}`,
      })
      .eq('id', sub.id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
