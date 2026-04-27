// ── DELETE /api/admin/trade-credits/[id]/drawdowns/[drawdownId] ───────
// Undo a draw-down. Adds amount_cents back to parent remaining_cents.
// Recomputes parent status.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; drawdownId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id, drawdownId } = await params

  // Load draw-down row to get amount.
  const { data: dd, error: ddErr } = await supabaseAdmin
    .from('trade_credit_drawdowns')
    .select('amount_cents, trade_credit_id')
    .eq('id', drawdownId)
    .eq('trade_credit_id', id)
    .maybeSingle()

  if (ddErr) return NextResponse.json({ error: ddErr.message }, { status: 500 })
  if (!dd) return NextResponse.json({ error: 'Draw-down not found' }, { status: 404 })

  // Load parent trade credit.
  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trade_credits')
    .select('remaining_cents, original_amount_cents')
    .eq('id', id)
    .maybeSingle()

  if (tcErr) return NextResponse.json({ error: tcErr.message }, { status: 500 })
  if (!tc) return NextResponse.json({ error: 'Trade credit not found' }, { status: 404 })

  // Delete the draw-down.
  const { error: delErr } = await supabaseAdmin
    .from('trade_credit_drawdowns')
    .delete()
    .eq('id', drawdownId)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Recompute remaining_cents + status.
  const newRemaining = tc.remaining_cents + dd.amount_cents
  const newStatus =
    newRemaining === 0
      ? 'fulfilled'
      : newRemaining === tc.original_amount_cents
        ? 'outstanding'
        : 'partial'

  const parentUpdate: Record<string, unknown> = {
    remaining_cents: newRemaining,
    status: newStatus,
  }
  // Re-open if reverting to non-closed state.
  if (newStatus !== 'fulfilled') {
    parentUpdate.closed_at = null
  }

  const { error: updateErr } = await supabaseAdmin
    .from('trade_credits')
    .update(parentUpdate)
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, remaining_cents: newRemaining, status: newStatus })
}
