// ── PATCH /api/admin/sow/[id]/schedule-send/[scheduleId] ────────────
//   Edit a still-scheduled row. Allowed fields: send_at, channel,
//   override_email, override_phone. Cannot change kind.
// ── DELETE /api/admin/sow/[id]/schedule-send/[scheduleId] ───────────
//   Cancels a scheduled SOW send. Idempotent — already-cancelled rows
//   return 200 with status='cancelled'. Already-fired rows are 409
//   (can't undo a send).
//
// Mirrors the invoice schedule-send PATCH/DELETE routes.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logSowScheduleCancelledActivity } from '@/lib/sow-send'

const VALID_CHANNELS = new Set(['email', 'sms', 'both'])
const MIN_LEAD_SECONDS = 60

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id, scheduleId } = await params

  const body = await request.json().catch(() => ({}))
  const { send_at, channel, override_email, override_phone } = body as {
    send_at?: string
    channel?: 'email' | 'sms' | 'both'
    override_email?: string | null
    override_phone?: string | null
  }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('sow_scheduled_sends')
    .select('id, status, channel, send_at, kind, override_email, override_phone')
    .eq('id', scheduleId)
    .eq('sow_id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  if (row.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Cannot edit a schedule in status ${row.status}` },
      { status: 409 },
    )
  }

  const updates: Record<string, unknown> = {}

  if (send_at !== undefined) {
    const sendAtDate = new Date(send_at)
    if (isNaN(sendAtDate.getTime())) {
      return NextResponse.json({ error: 'send_at is not a valid timestamp' }, { status: 400 })
    }
    const minSendAt = new Date(Date.now() + MIN_LEAD_SECONDS * 1000)
    if (sendAtDate < minSendAt) {
      return NextResponse.json(
        { error: `send_at must be at least ${MIN_LEAD_SECONDS}s in the future` },
        { status: 400 },
      )
    }
    updates.send_at = sendAtDate.toISOString()
  }

  if (channel !== undefined) {
    if (!VALID_CHANNELS.has(channel)) {
      return NextResponse.json({ error: `channel must be one of: ${Array.from(VALID_CHANNELS).join(', ')}` }, { status: 400 })
    }
    updates.channel = channel
  }

  if (override_email !== undefined) updates.override_email = override_email || null
  if (override_phone !== undefined) updates.override_phone = override_phone || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true })
  }

  // Race guard: only update if still scheduled.
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('sow_scheduled_sends')
    .update(updates)
    .eq('id', scheduleId)
    .eq('status', 'scheduled')
    .select('id, send_at, channel, status, kind, override_email, override_phone')
    .maybeSingle()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  if (!updated) {
    return NextResponse.json(
      { error: 'Schedule was picked up by cron between the read and write — refresh to see latest state' },
      { status: 409 },
    )
  }

  return NextResponse.json({ ok: true, schedule: updated })
}

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
