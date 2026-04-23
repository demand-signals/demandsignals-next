// ── /api/admin/subscription-plans/[id] — update + soft-delete ────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  billing_interval: z.enum(['month', 'quarter', 'year']).optional(),
  trial_days: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  tier: z.enum(['essential', 'growth', 'full', 'site_only']).optional(),
  is_retainer: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  let parsed: z.infer<typeof patchSchema>
  try {
    parsed = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Only include fields that were actually provided
  const updates: Record<string, unknown> = {}
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.price_cents !== undefined) updates.price_cents = parsed.price_cents
  if (parsed.billing_interval !== undefined) updates.billing_interval = parsed.billing_interval
  if (parsed.trial_days !== undefined) updates.trial_days = parsed.trial_days
  if (parsed.active !== undefined) updates.active = parsed.active
  if (parsed.sort_order !== undefined) updates.sort_order = parsed.sort_order
  if (parsed.tier !== undefined) updates.tier = parsed.tier
  if (parsed.is_retainer !== undefined) updates.is_retainer = parsed.is_retainer

  const { error } = await supabaseAdmin
    .from('subscription_plans')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  // Soft delete: set active = false to preserve subscription history
  const { error } = await supabaseAdmin
    .from('subscription_plans')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
