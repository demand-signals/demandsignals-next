// ── /api/admin/subscription-plans — list + create ───────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { BillingInterval } from '@/lib/invoice-types'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const activeOnly = sp.get('active') !== 'false'

  let q = supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .order('price_cents', { ascending: true })

  if (activeOnly) q = q.eq('active', true)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ plans: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    slug,
    name,
    description,
    price_cents,
    currency,
    billing_interval,
    trial_days,
    features,
    stripe_product_id,
    stripe_price_id,
  }: {
    slug: string
    name: string
    description?: string
    price_cents: number
    currency?: string
    billing_interval: BillingInterval
    trial_days?: number
    features?: string[]
    stripe_product_id?: string
    stripe_price_id?: string
  } = body

  if (!slug || !name || typeof price_cents !== 'number' || !billing_interval) {
    return NextResponse.json(
      { error: 'Required: slug, name, price_cents, billing_interval' },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      slug,
      name,
      description: description ?? null,
      price_cents,
      currency: currency ?? 'USD',
      billing_interval,
      trial_days: trial_days ?? 0,
      features: features ?? [],
      stripe_product_id: stripe_product_id ?? null,
      stripe_price_id: stripe_price_id ?? null,
      active: true,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}
