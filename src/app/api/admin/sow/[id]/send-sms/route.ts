// ── POST /api/admin/sow/[id]/send-sms ────────────────────────────────
// Synchronous admin SMS send. Auto-issues a draft SOW before
// dispatching.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchSowSms, issueSow } from '@/lib/sow-send'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const issueResult = await issueSow(id, { createdBy: auth.user.id })
  if (!issueResult.success) {
    return NextResponse.json({ error: issueResult.error ?? 'Issue failed' }, { status: 502 })
  }

  const result = await dispatchSowSms(id, { createdBy: auth.user.id })
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'SMS failed' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    issued: !issueResult.already_issued,
    recipient: result.recipient,
    message_id: result.message_id,
  })
}
