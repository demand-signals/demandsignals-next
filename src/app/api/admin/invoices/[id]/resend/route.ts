// ── POST /api/admin/invoices/[id]/resend ─────────────────────────────
// Resends an invoice via the same channel it was originally sent on
// (sent_via_channel). Calls the dispatch helpers directly — does NOT
// internal-fetch /send-email or /send-sms, which would fail the
// downstream requireAdmin() CSRF guard (server-to-server fetches don't
// carry browser headers; see CLAUDE.md §12).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { dispatchInvoiceEmail, dispatchInvoiceSms } from '@/lib/invoice-send'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select('id, sent_via_channel')
    .eq('id', id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const channel: 'email' | 'sms' = inv.sent_via_channel === 'sms' ? 'sms' : 'email'
  const result = channel === 'sms'
    ? await dispatchInvoiceSms(id, { createdBy: auth.user.id })
    : await dispatchInvoiceEmail(id, { createdBy: auth.user.id })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Resend failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, channel, recipient: result.recipient, message_id: result.message_id })
}
