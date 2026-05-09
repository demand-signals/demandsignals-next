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

// Find the Stripe customer that holds the saved card for this prospect.
//
// Two paths to the same answer (try in order):
//
// 1. Customers tagged in metadata: ensureStripeCustomer stamps
//    metadata.dsig_prospect_id when it creates a customer. If any such
//    customer has a saved card, prefer that.
//
// 2. Payment-link checkout reverse-lookup: the actual card-bearing
//    customer for an invoice that paid via a Stripe Payment Link is
//    typically a FRESH Stripe-auto-created customer from
//    customer_creation:'always' — it does NOT carry the dsig_prospect_id
//    metadata tag, so path 1 misses it. To find that customer, look at
//    the prospect's recent paid invoices in DSIG, pull each one's
//    stripe_payment_link_id, list checkout sessions for that link, and
//    grab the customer from a paid session. This is the workaround for
//    the customer-creation:'always' design choice.
async function findCustomerWithPaymentMethod(
  prospectId: string,
): Promise<string | null> {
  const s = stripe()

  // Path 1: metadata search
  try {
    const results = await s.customers.search({
      query: `metadata["dsig_prospect_id"]:"${prospectId}"`,
      limit: 20,
    })
    for (const c of results.data) {
      if (c.deleted) continue
      if (c.invoice_settings?.default_payment_method) return c.id
      const pms = await s.paymentMethods.list({ customer: c.id, limit: 1 })
      if (pms.data.length > 0) return c.id
    }
  } catch (e) {
    console.error('[retry-stripe] customers.search failed:', e instanceof Error ? e.message : e)
  }

  // Path 2: payment-link checkout reverse-lookup
  const { data: paidInvoices } = await supabaseAdmin
    .from('invoices')
    .select('id, stripe_payment_link_id')
    .eq('prospect_id', prospectId)
    .eq('status', 'paid')
    .not('stripe_payment_link_id', 'is', null)
    .order('paid_at', { ascending: false })
    .limit(10)

  for (const inv of paidInvoices ?? []) {
    const linkId = inv.stripe_payment_link_id as string | null
    if (!linkId) continue
    try {
      const sessions = await s.checkout.sessions.list({
        payment_link: linkId,
        limit: 5,
      })
      for (const sess of sessions.data) {
        if (sess.payment_status !== 'paid') continue
        const customerId =
          typeof sess.customer === 'string'
            ? sess.customer
            : (sess.customer?.id ?? null)
        if (!customerId) continue
        // Confirm this customer actually has a saved card before returning
        const pms = await s.paymentMethods.list({ customer: customerId, limit: 1 })
        if (pms.data.length > 0) return customerId
      }
    } catch (e) {
      console.error(
        '[retry-stripe] sessions.list for link',
        linkId,
        'failed:',
        e instanceof Error ? e.message : e,
      )
    }
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
  // the success payload or a parsed error string. Each invocation gets
  // a fresh idempotency suffix (timestamp) — admin retries are distinct
  // attempts, not duplicate-network-call retries, so reusing the key
  // would trigger Stripe's "key reused with different parameters"
  // rejection on every reconciliation pass.
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
        idempotencySuffix: `retry_${Date.now()}`,
      })
      return { ok: true, result }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  // First attempt
  let outcome = await attemptCreate()

  // If the failure is "no attached payment source," it usually means
  // EITHER (a) the prospect's stripe_customer_id is pointing at the wrong
  // customer (the empty pre-stamped one vs. the Payment-Link-created one
  // with the saved card), OR (b) the right customer has the card attached
  // but not set as default_payment_method (Stripe quirk for Payment-mode
  // Payment Links + customer_creation:'always'). Try both fixes in order.
  let reconciledCustomerId: string | null = null
  if (
    !outcome.ok &&
    /no attached payment source|no default payment method/i.test(outcome.error)
  ) {
    const s = stripe()

    // Fix (a): search for the right customer and reconcile prospect pointer
    try {
      const found = await findCustomerWithPaymentMethod(sub.prospect_id)
      if (found) {
        await supabaseAdmin
          .from('prospects')
          .update({ stripe_customer_id: found })
          .eq('id', sub.prospect_id)
        reconciledCustomerId = found
      }
    } catch (searchErr) {
      console.error(
        '[retry-stripe] customer reconciliation search failed:',
        searchErr instanceof Error ? searchErr.message : searchErr,
      )
    }

    // Fix (b): on whichever customer we'll use (newly-reconciled or original),
    // promote the most recent card to default_payment_method.
    try {
      const customerIdToSeed =
        reconciledCustomerId ??
        // Re-read the prospect in case ensureStripeCustomer just stamped a fresh ID
        (await supabaseAdmin
          .from('prospects')
          .select('stripe_customer_id')
          .eq('id', sub.prospect_id)
          .maybeSingle()).data?.stripe_customer_id ??
        null
      if (customerIdToSeed) {
        const pms = await s.paymentMethods.list({
          customer: customerIdToSeed,
          type: 'card',
          limit: 5,
        })
        if (pms.data.length > 0) {
          const newest = pms.data.reduce((a, b) => (a.created > b.created ? a : b))
          await s.customers.update(customerIdToSeed, {
            invoice_settings: { default_payment_method: newest.id },
          })
        }
      }
    } catch (seedErr) {
      console.error(
        '[retry-stripe] default-PM seed failed:',
        seedErr instanceof Error ? seedErr.message : seedErr,
      )
    }

    // Retry once after either/both fixes applied.
    if (reconciledCustomerId) {
      outcome = await attemptCreate()
    } else {
      // Even if no reconciliation was needed, the default-PM seed may have
      // unblocked things; retry anyway.
      outcome = await attemptCreate()
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
