// ── subscription-activation.ts ──────────────────────────────────────
// Deferred-start subscription activation: when a project phase marks
// complete, activate any subscriptions whose activation_phase_id
// matches that phase id.
//
// Activation creates the real Stripe subscription (with start date =
// today, since the phase is completing now), persists stripe ids
// back on the DSIG row, and flips status from 'trialing' to 'active'.
//
// Idempotent: subscriptions already with stripe_subscription_id set
// are skipped. Failures are logged but never throw — phase completion
// must always succeed even if a downstream Stripe call fails (we don't
// want to block project lifecycle on a Stripe outage).

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createStripeSubscription, computeEndDate } from '@/lib/stripe-subscriptions'

interface ActivatedSubscription {
  id: string
  stripe_subscription_id: string | null
  error: string | null
}

export async function activateSubscriptionsForPhase(
  phaseId: string,
): Promise<ActivatedSubscription[]> {
  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select(
      'id, prospect_id, plan_id, override_monthly_amount_cents, cycle_cap, stripe_subscription_id, status, plan:subscription_plans(name, billing_interval, price_cents)',
    )
    .eq('activation_phase_id', phaseId)
    .is('stripe_subscription_id', null)
    .eq('status', 'trialing')

  if (!subs || subs.length === 0) return []

  const today = new Date()
  const startISO = today.toISOString()
  const startDate = today.toISOString().slice(0, 10)

  const results: ActivatedSubscription[] = []

  for (const sub of subs) {
    const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan
    const interval = (plan?.billing_interval ?? 'month') as 'month' | 'quarter' | 'year'
    const amountCents = sub.override_monthly_amount_cents ?? plan?.price_cents ?? 0
    const productName = plan?.name ?? `DSIG Subscription ${sub.id.slice(0, 8)}`

    if (amountCents <= 0) {
      results.push({ id: sub.id, stripe_subscription_id: null, error: 'amount_cents is zero or missing' })
      continue
    }

    try {
      // Compute next period end based on interval, anchored to today.
      const periodEnd = new Date(today)
      if (interval === 'month') periodEnd.setMonth(periodEnd.getMonth() + 1)
      else if (interval === 'quarter') periodEnd.setMonth(periodEnd.getMonth() + 3)
      else if (interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + 1)

      const stripeResult = await createStripeSubscription({
        dsigSubscriptionId: sub.id,
        prospectId: sub.prospect_id,
        amountCents,
        interval,
        startDateISO: startISO,
        cycleCap: sub.cycle_cap ?? undefined,
        productName,
      })

      const endDate = sub.cycle_cap
        ? computeEndDate(startISO, interval, sub.cycle_cap)
        : null

      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          stripe_subscription_id: stripeResult.subscription.id,
          stripe_customer_id: stripeResult.customerId,
          start_date: startDate,
          current_period_start: startISO,
          current_period_end: periodEnd.toISOString(),
          next_invoice_date: periodEnd.toISOString().slice(0, 10),
          end_date: endDate,
        })
        .eq('id', sub.id)

      results.push({ id: sub.id, stripe_subscription_id: stripeResult.subscription.id, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[activateSubscriptionsForPhase] activation failed', sub.id, msg)
      // Annotate the subscription row with the error so admin sees what happened.
      await supabaseAdmin
        .from('subscriptions')
        .update({ notes: `Phase-complete activation FAILED: ${msg} — retry from /admin/subscriptions/${sub.id}` })
        .eq('id', sub.id)
      results.push({ id: sub.id, stripe_subscription_id: null, error: msg })
    }
  }

  return results
}
