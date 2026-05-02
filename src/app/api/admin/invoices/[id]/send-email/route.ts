// ── POST /api/admin/invoices/[id]/send-email ────────────────────────
// Synchronous admin email send. Auto-issues a draft invoice (renders
// PDF, uploads to R2, flips draft→sent) before dispatching, so admin
// can hit Email directly on a draft without first clicking the
// generic Send button.
//
// On a non-draft invoice this is a re-send — same code path, same
// activity log writes (CLAUDE.md §D).

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchInvoiceEmail, issueInvoice } from '@/lib/invoice-send'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const overrideEmail: string | undefined = body.email

  // Issue first if needed. Idempotent — no-op if status is past 'draft'.
  const issueResult = await issueInvoice(id, { createdBy: auth.user.id })
  if (!issueResult.success) {
    return NextResponse.json(
      { error: issueResult.error ?? 'Issue failed' },
      { status: 502 },
    )
  }

  // $0 invoices auto-pay during issuance — there's nothing to email a
  // payment link for. Surface the result so admin sees what happened.
  if (issueResult.is_zero && !issueResult.already_issued) {
    return NextResponse.json({
      ok: true,
      issued: true,
      status: issueResult.status,
      message: 'Invoice was zero-balance and auto-paid; no email sent.',
    })
  }

  const result = await dispatchInvoiceEmail(id, {
    overrideEmail,
    createdBy: auth.user.id,
  })

  if (!result.success) {
    const status = result.error === 'Invoice not found' ? 404 : 502
    return NextResponse.json({ error: result.error ?? 'Email send failed' }, { status })
  }

  return NextResponse.json({
    ok: true,
    issued: !issueResult.already_issued,
    status: issueResult.status,
    message_id: result.message_id,
    recipient: result.recipient,
  })
}
