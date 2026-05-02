// ── POST /api/admin/invoices/[id]/send-email ────────────────────────
// Synchronous admin send. Thin wrapper over dispatchInvoiceEmail() so
// that the cron path (/api/cron/scheduled-sends) and the admin button
// share one code path — including activity-log writes (CLAUDE.md §D).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchInvoiceEmail } from '@/lib/invoice-send'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const overrideEmail: string | undefined = body.email

  const result = await dispatchInvoiceEmail(id, {
    overrideEmail,
    createdBy: auth.user.id,
  })

  if (!result.success) {
    const status = result.error === 'Invoice not found' ? 404 : 502
    return NextResponse.json({ error: result.error ?? 'Email send failed' }, { status })
  }

  return NextResponse.json({ ok: true, message_id: result.message_id })
}
