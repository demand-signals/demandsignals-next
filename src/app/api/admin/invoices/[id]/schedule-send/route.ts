// ── /api/admin/invoices/[id]/schedule-send ──────────────────────────
//
// POST: queue a future send. Body: { send_at, channel, override_email?,
//   override_phone? }. Returns { id, send_at }.
// GET:  list scheduled rows for this invoice (default: status='scheduled').
//
// The cron at /api/cron/scheduled-sends fires due rows every 5 minutes.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logInvoiceScheduledActivity } from '@/lib/invoice-send'

const VALID_CHANNELS = new Set(['email', 'sms', 'both'])
const MIN_LEAD_SECONDS = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const { send_at, channel, override_email, override_phone, kind, reminder_label } = body as {
    send_at?: string
    channel?: string
    override_email?: string
    override_phone?: string
    kind?: 'send' | 'reminder'
    reminder_label?: string
  }

  if (!send_at || !channel) {
    return NextResponse.json({ error: 'send_at and channel are required' }, { status: 400 })
  }
  if (!VALID_CHANNELS.has(channel)) {
    return NextResponse.json({ error: `channel must be one of: ${Array.from(VALID_CHANNELS).join(', ')}` }, { status: 400 })
  }
  const rowKind: 'send' | 'reminder' = kind === 'reminder' ? 'reminder' : 'send'
  if (rowKind === 'reminder' && !reminder_label) {
    return NextResponse.json({ error: 'reminder_label is required when kind=reminder' }, { status: 400 })
  }
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

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, status, prospect_id')
    .eq('id', id)
    .maybeSingle()
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (!['sent', 'viewed', 'paid'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot schedule a send on an invoice in status ${invoice.status}` },
      { status: 409 },
    )
  }

  const { data: row, error: insErr } = await supabaseAdmin
    .from('invoice_scheduled_sends')
    .insert({
      invoice_id: id,
      channel,
      send_at: sendAtDate.toISOString(),
      override_email: override_email ?? null,
      override_phone: override_phone ?? null,
      kind: rowKind,
      reminder_label: rowKind === 'reminder' ? reminder_label : null,
      created_by: auth.user.id,
    })
    .select('id, send_at, channel, status, kind, reminder_label')
    .single()

  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  await logInvoiceScheduledActivity({
    invoice: { id: invoice.id, invoice_number: invoice.invoice_number, prospect_id: invoice.prospect_id },
    channel: channel as 'email' | 'sms' | 'both',
    sendAt: sendAtDate.toISOString(),
    recipient: override_email ?? override_phone ?? null,
    createdBy: auth.user.id,
  })

  return NextResponse.json({ id: row.id, send_at: row.send_at, channel: row.channel, status: row.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') // optional

  let query = supabaseAdmin
    .from('invoice_scheduled_sends')
    .select('id, channel, send_at, status, fired_at, override_email, override_phone, error_message, created_at, created_by, kind, reminder_label')
    .eq('invoice_id', id)
    .order('send_at', { ascending: true })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
