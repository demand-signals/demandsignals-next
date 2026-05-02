// ── /api/admin/invoices/[id]/reminders ──────────────────────────────
//
// POST: bulk-insert reminder rows. Body: {
//   channel: 'email' | 'sms' | 'both',
//   pre_due_days: number[],     // e.g. [3, 1] = 3 days before, 1 day before
//   post_due_days: number[],    // e.g. [3, 7, 14] = 3, 7, 14 days past due
//   include_day_of?: boolean,   // also fire on the due date
// }
// Reads invoice.due_date and computes send_at for each offset relative
// to it. Skips offsets that would land in the past (cron's MIN_LEAD
// guard would reject them anyway).
//
// GET: list all reminder rows for this invoice (kind='reminder' only).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_CHANNELS = new Set(['email', 'sms', 'both'])

interface ReminderRequestBody {
  channel?: string
  pre_due_days?: number[]
  post_due_days?: number[]
  include_day_of?: boolean
  override_email?: string
  override_phone?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json().catch(() => ({}))) as ReminderRequestBody
  const channel = body.channel
  if (!channel || !VALID_CHANNELS.has(channel)) {
    return NextResponse.json(
      { error: `channel must be one of: ${Array.from(VALID_CHANNELS).join(', ')}` },
      { status: 400 },
    )
  }

  const preDays = (body.pre_due_days ?? []).filter((n) => Number.isInteger(n) && n > 0)
  const postDays = (body.post_due_days ?? []).filter((n) => Number.isInteger(n) && n > 0)
  const includeDayOf = !!body.include_day_of

  if (preDays.length === 0 && postDays.length === 0 && !includeDayOf) {
    return NextResponse.json({ error: 'At least one offset is required' }, { status: 400 })
  }

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, status, due_date, prospect_id')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (!invoice.due_date) {
    return NextResponse.json(
      { error: 'Invoice has no due_date — set one before scheduling reminders' },
      { status: 400 },
    )
  }
  if (!['sent', 'viewed'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot schedule reminders on an invoice in status ${invoice.status}` },
      { status: 409 },
    )
  }

  // Construct ISO timestamps from due_date + offsets.
  // due_date is a DATE column — anchor at 09:00 local time so reminders
  // arrive at a reasonable hour rather than midnight UTC.
  const dueAnchor = new Date(invoice.due_date + 'T09:00:00')

  const rows: Array<{
    invoice_id: string
    channel: string
    send_at: string
    kind: 'reminder'
    reminder_label: string
    override_email: string | null
    override_phone: string | null
    created_by: string
  }> = []

  const minSendAt = new Date(Date.now() + 60_000)

  for (const days of preDays) {
    const at = new Date(dueAnchor.getTime() - days * 86_400_000)
    if (at < minSendAt) continue
    rows.push({
      invoice_id: id,
      channel,
      send_at: at.toISOString(),
      kind: 'reminder',
      reminder_label: `${days} day${days === 1 ? '' : 's'} before due`,
      override_email: body.override_email ?? null,
      override_phone: body.override_phone ?? null,
      created_by: auth.user.id,
    })
  }

  if (includeDayOf) {
    if (dueAnchor >= minSendAt) {
      rows.push({
        invoice_id: id,
        channel,
        send_at: dueAnchor.toISOString(),
        kind: 'reminder',
        reminder_label: 'Due today',
        override_email: body.override_email ?? null,
        override_phone: body.override_phone ?? null,
        created_by: auth.user.id,
      })
    }
  }

  for (const days of postDays) {
    const at = new Date(dueAnchor.getTime() + days * 86_400_000)
    if (at < minSendAt) continue
    rows.push({
      invoice_id: id,
      channel,
      send_at: at.toISOString(),
      kind: 'reminder',
      reminder_label: `Past due — ${days} day${days === 1 ? '' : 's'}`,
      override_email: body.override_email ?? null,
      override_phone: body.override_phone ?? null,
      created_by: auth.user.id,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'All requested offsets are in the past (or within 60s of now)' },
      { status: 400 },
    )
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('invoice_scheduled_sends')
    .insert(rows)
    .select('id, send_at, channel, status, reminder_label')

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ inserted: inserted?.length ?? 0, rows: inserted ?? [] })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('invoice_scheduled_sends')
    .select('id, channel, send_at, status, fired_at, reminder_label, error_message, created_at')
    .eq('invoice_id', id)
    .eq('kind', 'reminder')
    .order('send_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
