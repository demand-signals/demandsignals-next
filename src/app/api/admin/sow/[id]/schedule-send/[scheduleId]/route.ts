// ── DELETE /api/admin/sow/[id]/schedule-send/[scheduleId] ───────────
// Cancels a scheduled SOW send. Idempotent — already-cancelled rows
// return 200 with status='cancelled'. Already-fired rows are 409
// (can't undo a send).
//
// Mirrors the invoice schedule-send DELETE route.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logSowScheduleCancelledActivity } from '@/lib/sow-send'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id, scheduleId } = await params

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('sow_scheduled_sends')
    .select('id, status, channel, send_at, sow:sow_documents(sow_number, prospect_id)')
    .eq('id', scheduleId)
    .eq('sow_id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  if (row.status === 'cancelled') {
    return NextResponse.json({ ok: true, status: 'cancelled', already: true })
  }
  if (row.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Cannot cancel a schedule in status ${row.status}` },
      { status: 409 },
    )
  }

  const { error: updateErr } = await supabaseAdmin
    .from('sow_scheduled_sends')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)
    .eq('status', 'scheduled') // race guard

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Supabase select with embed returns object or array depending on
  // relation cardinality — narrow it.
  const sow = Array.isArray(row.sow) ? row.sow[0] : row.sow
  if (sow?.sow_number) {
    await logSowScheduleCancelledActivity({
      sow: { sow_number: sow.sow_number, prospect_id: sow.prospect_id },
      channel: row.channel as 'email' | 'sms' | 'both',
      sendAt: row.send_at,
      createdBy: auth.user.id,
    })
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
