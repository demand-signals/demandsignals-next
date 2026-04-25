// ── stripe-subscriptions.ts ─────────────────────────────────────────
// Stripe subscription lifecycle helpers.
// Pairs with src/lib/stripe-sync.ts (which handles one-off invoice payments).

import type Stripe from 'stripe'
import { stripe, idempotencyKey } from './stripe-client'
import { ensureStripeCustomer } from './stripe-sync'

// ── Map DSIG billing interval to Stripe price recurring spec ───────
function intervalToStripeRecurring(
  interval: 'month' | 'quarter' | 'year',
): { interval: 'month' | 'year'; interval_count: number } {
  switch (interval) {
    case 'month':
      return { interval: 'month', interval_count: 1 }
    case 'quarter':
      return { interval: 'month', interval_count: 3 }
    case 'year':
      return { interval: 'year', interval_count: 1 }
  }
}

/**
 * Compute end_date given a start date, interval, and cycle_cap.
 * Returns null if cycle_cap is undefined (open-ended subscription).
 */
export function computeEndDate(
  startISO: string,
  interval: 'month' | 'quarter' | 'year',
  cycleCap: number | undefined,
): string | null {
  if (!cycleCap || cycleCap <= 0) return null
  const start = new Date(startISO)
  const end = new Date(start)
  if (interval === 'month') end.setMonth(end.getMonth() + cycleCap)
  else if (interval === 'quarter') end.setMonth(end.getMonth() + cycleCap * 3)
  else if (interval === 'year') end.setFullYear(end.getFullYear() + cycleCap)
  return end.toISOString()
}

/**
 * Create a Stripe Subscription for a DSIG subscription row.
 *
 * Behavior:
 *   - Creates a one-off Stripe Product + Price for this subscription
 *     (we don't reuse Stripe products across DSIG subscriptions because
 *     each may have a custom amount via override_monthly_amount_cents).
 *   - If startDate > today, sets trial_end = startDate (no proration; first
 *     charge fires at startDate).
 *   - If cycleCap is set, computes cancel_at = startDate + (cycleCap * interval).
 *   - collection_method = 'charge_automatically' (assumes a saved card on
 *     the customer; card collection is handled separately via Customer Portal
 *     for future-start subscriptions).
 */
export async function createStripeSubscription(args: {
  dsigSubscriptionId: string
  prospectId: string
  amountCents: number
  interval: 'month' | 'quarter' | 'year'
  startDateISO: string
  cycleCap?: number
  productName: string
}): Promise<{ subscription: Stripe.Subscription; customerId: string; endDate: string | null }> {
  const customerId = await ensureStripeCustomer(args.prospectId)
  const s = stripe()

  const product = await s.products.create(
    {
      name: args.productName,
      metadata: {
        dsig_subscription_id: args.dsigSubscriptionId,
      },
    },
    { idempotencyKey: idempotencyKey('product_for_sub', args.dsigSubscriptionId) },
  )

  const recurring = intervalToStripeRecurring(args.interval)
  const price = await s.prices.create(
    {
      product: product.id,
      unit_amount: args.amountCents,
      currency: 'usd',
      recurring,
    },
    { idempotencyKey: idempotencyKey('price_for_sub', args.dsigSubscriptionId) },
  )

  const startUnix = Math.floor(new Date(args.startDateISO).getTime() / 1000)
  const nowUnix = Math.floor(Date.now() / 1000)
  const isFutureStart = startUnix > nowUnix + 60  // 1-min buffer for clock skew

  const endDate = computeEndDate(args.startDateISO, args.interval, args.cycleCap)
  const cancelAtUnix = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: price.id }],
    collection_method: 'charge_automatically',
    metadata: {
      dsig_subscription_id: args.dsigSubscriptionId,
    },
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
  }

  if (isFutureStart) {
    subscriptionParams.trial_end = startUnix
    subscriptionParams.proration_behavior = 'none'
  }

  if (cancelAtUnix) {
    subscriptionParams.cancel_at = cancelAtUnix
  }

  const subscription = await s.subscriptions.create(subscriptionParams, {
    idempotencyKey: idempotencyKey('subscription', args.dsigSubscriptionId),
  })

  return { subscription, customerId, endDate }
}

/**
 * Pause a Stripe subscription's collection.
 * `behavior: 'void'` = no invoices are generated during pause; existing draft
 * invoices are voided.
 */
export async function pauseStripeSubscription(stripeSubscriptionId: string): Promise<void> {
  const s = stripe()
  await s.subscriptions.update(
    stripeSubscriptionId,
    { pause_collection: { behavior: 'void' } },
    { idempotencyKey: idempotencyKey('pause', stripeSubscriptionId + '_' + new Date().toISOString().slice(0, 10)) },
  )
}

/**
 * Resume a paused subscription. Optionally update cancel_at to push out
 * the end-date by the pause duration.
 */
export async function resumeStripeSubscription(
  stripeSubscriptionId: string,
  newCancelAtISO: string | null,
): Promise<void> {
  const s = stripe()
  const params: Stripe.SubscriptionUpdateParams = {
    pause_collection: '' as unknown as Stripe.SubscriptionUpdateParams['pause_collection'],
  }
  if (newCancelAtISO) {
    params.cancel_at = Math.floor(new Date(newCancelAtISO).getTime() / 1000)
  }
  await s.subscriptions.update(stripeSubscriptionId, params, {
    idempotencyKey: idempotencyKey('resume', stripeSubscriptionId + '_' + new Date().toISOString().slice(0, 10)),
  })
}

/**
 * Generate a Stripe Customer Portal session URL for the prospect.
 * Used to send a magic-link "Add payment method" email when a subscription
 * has a future start and the customer has no saved card yet.
 */
export async function createCustomerPortalSession(
  prospectId: string,
  returnUrl: string,
): Promise<string> {
  const customerId = await ensureStripeCustomer(prospectId)
  const s = stripe()
  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}
