// ── GET /api/admin/invoices/[id]/send-email/preview ─────────────────
// Returns the email that WOULD fire if /send-email were POSTed.
// Same recipient resolution + message build as dispatchInvoiceEmail —
// no Resend call, no DB writes, no activity rows. Used by the admin
// preview-before-send modal so the previewed bytes are exactly what
// would go out on confirm.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { previewInvoiceEmail } from '@/lib/invoice-send'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { searchParams } = new URL(request.url)
  const overrideEmail = searchParams.get('override_email') ?? undefined

  const result = await previewInvoiceEmail(id, overrideEmail)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json(result)
}
