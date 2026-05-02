// ── POST /api/admin/sow/[id]/send-email ──────────────────────────────
// Manual email send for a SOW that's already been sent at least once.
// Re-renders nothing, re-uploads nothing — just fires the email through
// dispatchSowEmail with the existing PDF (fetched from R2).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchSowEmail } from '@/lib/sow-send'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const result = await dispatchSowEmail(id, { createdBy: auth.user.id })
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Email failed' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    recipient: result.recipient,
    message_id: result.message_id,
  })
}
