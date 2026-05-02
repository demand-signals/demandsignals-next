// ── POST /api/admin/sow/[id]/send-sms ────────────────────────────────
// Manual SMS send for a SOW. Body is the SMS text built by
// dispatchSowSms — short message + magic link.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchSowSms } from '@/lib/sow-send'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const result = await dispatchSowSms(id, { createdBy: auth.user.id })
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'SMS failed' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    recipient: result.recipient,
    message_id: result.message_id,
  })
}
