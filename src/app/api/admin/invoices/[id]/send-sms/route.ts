// ── POST /api/admin/invoices/[id]/send-sms ──────────────────────────
// Synchronous admin send. Thin wrapper over dispatchInvoiceSms() so the
// cron path and the admin button share one code path — including
// activity-log writes (CLAUDE.md §D). Respects SMS_TEST_MODE allowlist
// inside the underlying twilio-sms helper.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchInvoiceSms } from '@/lib/invoice-send'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const overridePhone: string | undefined = body.phone

  const result = await dispatchInvoiceSms(id, {
    overridePhone,
    createdBy: auth.user.id,
  })

  if (!result.success) {
    const status = result.error === 'Invoice not found' ? 404 : 502
    return NextResponse.json({ error: result.error ?? 'SMS send failed' }, { status })
  }

  return NextResponse.json({ ok: true, message_id: result.message_id })
}
