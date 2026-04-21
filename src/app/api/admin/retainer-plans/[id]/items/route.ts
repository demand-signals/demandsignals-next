// ── /api/admin/retainer-plans/[id]/items — replace item list ─────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const putSchema = z.object({
  items: z.array(
    z.object({
      service_id: z.string().min(1),
      quantity: z.number().int().positive().optional(),
    }),
  ),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  let parsed: z.infer<typeof putSchema>
  try {
    parsed = putSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Step 1: Delete all existing items for this plan
  const { error: delErr } = await supabaseAdmin
    .from('subscription_plan_items')
    .delete()
    .eq('plan_id', id)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Step 2: Insert new items if provided
  if (parsed.items.length > 0) {
    const rows = parsed.items.map((item) => ({
      plan_id: id,
      service_id: item.service_id,
      quantity: item.quantity ?? 1,
    }))

    const { error: insErr } = await supabaseAdmin
      .from('subscription_plan_items')
      .insert(rows)

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
