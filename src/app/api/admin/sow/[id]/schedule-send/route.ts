// ── /api/admin/sow/[id]/schedule-send ───────────────────────────────
//
// POST: queue a future SOW send. Body: { send_at, channel, kind?,
//   override_email?, override_phone? }. kind defaults to 'send' for
//   already-issued SOWs and 'issue_and_send' for drafts.
// GET:  list scheduled rows for this SOW.
//
// Mirrors invoice schedule-send route. The cron at
// /api/cron/scheduled-sends fires due rows from both tables every 5 min.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logSowScheduledActivity } from '@/lib/sow-send'

const VALID_CHANNELS = new Set(['email', 'sms', 'both'])
const VALID_KINDS = new Set(['send', 'issue_and_send'])
const MIN_LEAD_SECONDS = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const { send_at, channel, override_email, override_phone, kind } = body as {
    send_at?: string
    channel?: string
    override_email?: string
    override_phone?: string
    kind?: 'send' | 'issue_and_send'
  }

  if (!send_at || !channel) {
    return NextResponse.json({ error: 'send_at and channel are required' }, { status: 400 })
  }
  if (!VALID_CHANNELS.has(channel)) {
    return NextResponse.json({ error: `channel must be one of: ${Array.from(VALID_CHANNELS).join(', ')}` }, { status: 400 })
  }
  const rowKind: 'send' | 'issue_and_send' =
    kind && VALID_KINDS.has(kind) ? kind : 'send'
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

  const { data: sow, error: sowErr } = await supabaseAdmin
    .from('sow_documents')
    .select('id, sow_number, status, prospect_id')
    .eq('id', id)
    .maybeSingle()
  if (sowErr) return NextResponse.json({ error: sowErr.message }, { status: 500 })
  if (!sow) return NextResponse.json({ error: 'SOW not found' }, { status: 404 })

  // Status gate depends on kind:
  //   issue_and_send → must be draft
  //   send           → must be sent or accepted (already issued)
  if (rowKind === 'issue_and_send') {
    if (sow.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot schedule issue_and_send on a ${sow.status} SOW — it's already been issued. Use Schedule (kind=send) to queue a resend.` },
        { status: 409 },
      )
    }
  } else {
    if (!['sent', 'viewed', 'accepted'].includes(sow.status)) {
      return NextResponse.json(
        { error: `Cannot schedule a send on a SOW in status ${sow.status}` },
        { status: 409 },
      )
    }
  }

  const { data: row, error: insErr } = await supabaseAdmin
    .from('sow_scheduled_sends')
    .insert({
      sow_id: id,
      channel,
      send_at: sendAtDate.toISOString(),
      override_email: override_email ?? null,
      override_phone: override_phone ?? null,
      kind: rowKind,
      created_by: auth.user.id,
    })
    .select('id, send_at, channel, status, kind')
    .single()

  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  await logSowScheduledActivity({
    sow: { id: sow.id, sow_number: sow.sow_number, prospect_id: sow.prospect_id },
    channel: channel as 'email' | 'sms' | 'both',
    sendAt: sendAtDate.toISOString(),
    recipient: override_email ?? override_phone ?? null,
    createdBy: auth.user.id,
  })

  return NextResponse.json({
    id: row.id,
    send_at: row.send_at,
    channel: row.channel,
    status: row.status,
    kind: row.kind,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  let query = supabaseAdmin
    .from('sow_scheduled_sends')
    .select('id, channel, send_at, status, fired_at, override_email, override_phone, error_message, created_at, created_by, kind')
    .eq('sow_id', id)
    .order('send_at', { ascending: true })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
