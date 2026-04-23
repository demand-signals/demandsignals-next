// ── /api/admin/subscription-plans — list + create ───────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  billing_interval: z.enum(['month', 'quarter', 'year']),
  description: z.string().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  trial_days: z.number().int().nonnegative().optional(),
  features: z.array(z.string()).optional(),
  stripe_product_id: z.string().optional(),
  stripe_price_id: z.string().optional(),
  tier: z.enum(['essential', 'growth', 'full', 'site_only']).optional(),
  is_retainer: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

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

  let parsed: z.infer<typeof createSchema>
  try {
    parsed = createSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      slug: parsed.slug,
      name: parsed.name,
      billing_interval: parsed.billing_interval,
      description: parsed.description ?? null,
      price_cents: parsed.price_cents ?? null,
      currency: parsed.currency ?? 'USD',
      trial_days: parsed.trial_days ?? 0,
      features: parsed.features ?? [],
      stripe_product_id: parsed.stripe_product_id ?? null,
      stripe_price_id: parsed.stripe_price_id ?? null,
      tier: parsed.tier ?? null,
      is_retainer: parsed.is_retainer ?? false,
      sort_order: parsed.sort_order ?? 0,
      active: true,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
