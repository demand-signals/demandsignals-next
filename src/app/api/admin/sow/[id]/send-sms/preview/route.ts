// ── GET /api/admin/sow/[id]/send-sms/preview ─────────────────────────
// Returns the SMS that WOULD fire if /send-sms were POSTed.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { previewSowSms } from '@/lib/sow-send'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const overridePhone = new URL(request.url).searchParams.get('override_phone') ?? undefined
  const result = await previewSowSms(id, overridePhone)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}
