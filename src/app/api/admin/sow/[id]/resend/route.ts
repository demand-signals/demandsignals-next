// ── POST /api/admin/sow/[id]/resend ──────────────────────────────────
// Re-fires the SOW via the channel (email|sms) admin chooses. SOW
// table doesn't have a sent_via_channel column, so the caller picks
// via ?channel= query (defaults to email).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchSowEmail, dispatchSowSms } from '@/lib/sow-send'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const channel = (new URL(request.url).searchParams.get('channel') ?? 'email') as 'email' | 'sms'
  const result =
    channel === 'sms'
      ? await dispatchSowSms(id, { createdBy: auth.user.id })
      : await dispatchSowEmail(id, { createdBy: auth.user.id })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Resend failed' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    channel,
    recipient: result.recipient,
    message_id: result.message_id,
  })
}
