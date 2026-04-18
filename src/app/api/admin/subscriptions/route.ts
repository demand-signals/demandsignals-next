// ── /api/admin/subscriptions — list + create ────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isStripeEnabled, stripe, idempotencyKey } from '@/lib/stripe-client'
import { ensureStripeCustomer } from '@/lib/stripe-sync'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  const prospectId = sp.get('prospect_id')

  let q = supabaseAdmin
    .from('subscriptions')
    .select('*, prospect:prospects(business_name, owner_email), plan:subscription_plans(name, price_cents, billing_interval)')
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  if (prospectId) q = q.eq('prospect_id', prospectId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscriptions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    prospect_id,
    plan_id,
    start_date,
    create_in_stripe,
  }: {
    prospect_id: string
    plan_id: string
    start_date?: string // ISO date; default = now
    create_in_stripe?: boolean
  } = body

  if (!prospect_id || !plan_id) {
    return NextResponse.json(
      { error: 'Required: prospect_id, plan_id' },
      { status: 400 },
    )
  }

  const { data: plan, error: planErr } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('id', plan_id)
    .maybeSingle()
  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const start = start_date ? new Date(start_date) : new Date()
  const periodEnd = new Date(start)
  const trialDays = plan.trial_days ?? 0
  if (plan.billing_interval === 'month') periodEnd.setMonth(periodEnd.getMonth() + 1)
  else if (plan.billing_interval === 'quarter') periodEnd.setMonth(periodEnd.getMonth() + 3)
  else if (plan.billing_interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  const nextInvoiceDate = new Date(start)
  nextInvoiceDate.setDate(nextInvoiceDate.getDate() + trialDays)

  // Optionally create the subscription in Stripe immediately.
  let stripeSubId: string | null = null
  let stripeCustomerId: string | null = null
  if (create_in_stripe) {
    if (!(await isStripeEnabled())) {
      return NextResponse.json(
        { error: 'Stripe is disabled — cannot create_in_stripe' },
        { status: 503 },
      )
    }
    if (!plan.stripe_price_id) {
      return NextResponse.json(
        { error: 'Plan has no stripe_price_id — set it in the plan first' },
        { status: 400 },
      )
    }
    try {
      stripeCustomerId = await ensureStripeCustomer(prospect_id)
      const sub = await stripe().subscriptions.create(
        {
          customer: stripeCustomerId,
          items: [{ price: plan.stripe_price_id }],
          trial_period_days: trialDays > 0 ? trialDays : undefined,
          metadata: {
            dsig_plan_id: plan.id,
            dsig_plan_slug: plan.slug,
          },
        },
        {
          idempotencyKey: idempotencyKey('subscription_for_prospect_plan', `${prospect_id}_${plan_id}`),
        },
      )
      stripeSubId = sub.id
    } catch (e) {
      return NextResponse.json(
        { error: `Stripe subscription create failed: ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      )
    }
  }

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      prospect_id,
      plan_id,
      status: trialDays > 0 ? 'trialing' : 'active',
      stripe_subscription_id: stripeSubId,
      stripe_customer_id: stripeCustomerId,
      current_period_start: start.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_invoice_date: nextInvoiceDate.toISOString().slice(0, 10),
    })
    .select('*')
    .single()

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })
  return NextResponse.json({ subscription: sub })
}
