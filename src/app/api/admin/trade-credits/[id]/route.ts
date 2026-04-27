// ── GET /api/admin/trade-credits/[id] — detail (with drawdowns) ──────
// ── PATCH /api/admin/trade-credits/[id] — update description/notes/status

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['outstanding', 'partial', 'fulfilled', 'written_off']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: tc, error } = await supabaseAdmin
    .from('trade_credits')
    .select('*, prospect:prospects(business_name, id)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: drawdowns } = await supabaseAdmin
    .from('trade_credit_drawdowns')
    .select('*')
    .eq('trade_credit_id', id)
    .order('delivered_on', { ascending: false })

  return NextResponse.json({
    trade_credit: tc,
    drawdowns: drawdowns ?? [],
  })
}

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
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Invalid request body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.notes !== undefined) updates.notes = parsed.notes
  if (parsed.status !== undefined) {
    updates.status = parsed.status
    if (parsed.status === 'fulfilled' || parsed.status === 'written_off') {
      updates.closed_at = new Date().toISOString()
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabaseAdmin
    .from('trade_credits')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
