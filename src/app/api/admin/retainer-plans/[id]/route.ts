// ── /api/admin/retainer-plans/[id] — update + soft-delete ───────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  tier: z.enum(['essential', 'growth', 'full', 'site_only']).optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
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
  if (parsed.tier !== undefined) updates.tier = parsed.tier
  if (parsed.sort_order !== undefined) updates.sort_order = parsed.sort_order
  if (parsed.active !== undefined) updates.active = parsed.active

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

  // Soft delete: set active = false to preserve history
  const { error } = await supabaseAdmin
    .from('subscription_plans')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
