// ── POST /api/admin/trade-credits/[id]/drawdowns ─────────────────────
// Record a trade delivery (draw-down). Decrements remaining_cents on parent.
// Sets status='partial' if remaining > 0, 'fulfilled' + closed_at if hits 0.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const postSchema = z.object({
  amount_cents: z.number().int().positive(),
  description: z.string().min(1),
  delivered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().nullable().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  let parsed: z.infer<typeof postSchema>
  try {
    parsed = postSchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Invalid request body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Load current trade credit.
  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trade_credits')
    .select('remaining_cents, status')
    .eq('id', id)
    .maybeSingle()

  if (tcErr) return NextResponse.json({ error: tcErr.message }, { status: 500 })
  if (!tc) return NextResponse.json({ error: 'Trade credit not found' }, { status: 404 })
  if (tc.status === 'fulfilled' || tc.status === 'written_off') {
    return NextResponse.json(
      { error: `Trade credit is already ${tc.status}` },
      { status: 409 },
    )
  }

  if (parsed.amount_cents > tc.remaining_cents) {
    return NextResponse.json(
      {
        error: `Draw-down amount ($${(parsed.amount_cents / 100).toFixed(2)}) exceeds remaining balance ($${(tc.remaining_cents / 100).toFixed(2)})`,
      },
      { status: 409 },
    )
  }

  // Insert draw-down row.
  const deliveredOn = parsed.delivered_on ?? new Date().toISOString().slice(0, 10)
  const { data: drawdown, error: ddErr } = await supabaseAdmin
    .from('trade_credit_drawdowns')
    .insert({
      trade_credit_id: id,
      amount_cents: parsed.amount_cents,
      description: parsed.description,
      delivered_on: deliveredOn,
      recorded_by: auth.user.id,
      notes: parsed.notes ?? null,
    })
    .select('*')
    .single()

  if (ddErr) return NextResponse.json({ error: ddErr.message }, { status: 500 })

  // Update remaining_cents + status on parent.
  const newRemaining = tc.remaining_cents - parsed.amount_cents
  const newStatus = newRemaining === 0 ? 'fulfilled' : 'partial'
  const parentUpdate: Record<string, unknown> = {
    remaining_cents: newRemaining,
    status: newStatus,
  }
  if (newStatus === 'fulfilled') {
    parentUpdate.closed_at = new Date().toISOString()
  }

  const { error: updateErr } = await supabaseAdmin
    .from('trade_credits')
    .update(parentUpdate)
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ drawdown, remaining_cents: newRemaining, status: newStatus }, { status: 201 })
}
