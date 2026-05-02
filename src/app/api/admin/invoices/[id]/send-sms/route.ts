// ── POST /api/admin/invoices/[id]/send-sms ──────────────────────────
// Synchronous admin SMS send. Auto-issues a draft invoice (renders
// PDF, uploads to R2, flips draft→sent) before dispatching, so admin
// can hit SMS directly on a draft.
//
// Respects SMS_TEST_MODE allowlist inside the underlying twilio-sms
// helper.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchInvoiceSms, issueInvoice } from '@/lib/invoice-send'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const overridePhone: string | undefined = body.phone

  // Issue first if needed. Idempotent.
  const issueResult = await issueInvoice(id, { createdBy: auth.user.id })
  if (!issueResult.success) {
    return NextResponse.json(
      { error: issueResult.error ?? 'Issue failed' },
      { status: 502 },
    )
  }

  if (issueResult.is_zero && !issueResult.already_issued) {
    return NextResponse.json({
      ok: true,
      issued: true,
      status: issueResult.status,
      message: 'Invoice was zero-balance and auto-paid; no SMS sent.',
    })
  }

  const result = await dispatchInvoiceSms(id, {
    overridePhone,
    createdBy: auth.user.id,
  })

  if (!result.success) {
    const status = result.error === 'Invoice not found' ? 404 : 502
    return NextResponse.json({ error: result.error ?? 'SMS send failed' }, { status })
  }

  return NextResponse.json({
    ok: true,
    issued: !issueResult.already_issued,
    status: issueResult.status,
    message_id: result.message_id,
    recipient: result.recipient,
  })
}
