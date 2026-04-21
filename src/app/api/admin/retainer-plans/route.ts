// ── /api/admin/retainer-plans — list + create ────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRetainerPlans } from '@/lib/retainer'

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  tier: z.enum(['essential', 'growth', 'full', 'site_only']),
  sort_order: z.number().int().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const plans = await getRetainerPlans().catch((err: Error) =>
    NextResponse.json({ error: err.message }, { status: 500 }),
  )

  if (plans instanceof NextResponse) return plans

  return NextResponse.json({ plans })
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

  const { slug, name, description, price_cents, tier, sort_order } = parsed

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      slug,
      name,
      description: description ?? null,
      price_cents: price_cents ?? null,
      tier,
      sort_order: sort_order ?? 0,
      is_retainer: true,
      billing_interval: 'month',
      currency: 'USD',
      active: true,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
