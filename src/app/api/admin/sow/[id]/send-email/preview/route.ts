// ── GET /api/admin/sow/[id]/send-email/preview ───────────────────────
// Returns the email that WOULD fire if /send-email were POSTed.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { previewSowEmail } from '@/lib/sow-send'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const overrideEmail = new URL(request.url).searchParams.get('override_email') ?? undefined
  const result = await previewSowEmail(id, overrideEmail)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}
