// ── DELETE /api/admin/invoices/[id]/schedule-send/[scheduleId] ──────
// Cancels a scheduled send. Idempotent — already-cancelled rows return 200
// with status='cancelled'. Already-fired rows are 409 (can't undo a send).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logInvoiceScheduleCancelledActivity } from '@/lib/invoice-send'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id, scheduleId } = await params

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('invoice_scheduled_sends')
    .select('id, status, channel, send_at, invoice:invoices(invoice_number, prospect_id)')
    .eq('id', scheduleId)
    .eq('invoice_id', id)
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
    .from('invoice_scheduled_sends')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)
    .eq('status', 'scheduled') // race guard — only flip if still scheduled

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // The Supabase select with embed `invoice:invoices(...)` returns either an
  // object or array depending on the relation cardinality — narrow it.
  const inv = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice
  if (inv?.invoice_number) {
    await logInvoiceScheduleCancelledActivity({
      invoice: { invoice_number: inv.invoice_number, prospect_id: inv.prospect_id },
      channel: row.channel as 'email' | 'sms' | 'both',
      sendAt: row.send_at,
      createdBy: auth.user.id,
    })
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
