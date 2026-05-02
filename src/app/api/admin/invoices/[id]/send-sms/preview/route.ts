// ── GET /api/admin/invoices/[id]/send-sms/preview ───────────────────
// Returns the SMS that WOULD fire if /send-sms were POSTed.
// Same recipient resolution + message build as dispatchInvoiceSms —
// no Twilio call, no DB writes.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { previewInvoiceSms } from '@/lib/invoice-send'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { searchParams } = new URL(request.url)
  const overridePhone = searchParams.get('override_phone') ?? undefined

  const result = await previewInvoiceSms(id, overridePhone)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json(result)
}
