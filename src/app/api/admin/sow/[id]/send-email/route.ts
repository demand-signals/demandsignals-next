// ── POST /api/admin/sow/[id]/send-email ──────────────────────────────
// Synchronous admin email send. Auto-issues a draft SOW (renders PDF,
// uploads to R2, flips draft→sent) before dispatching, so admin can
// hit Email directly on a draft.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { dispatchSowEmail, issueSow } from '@/lib/sow-send'

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

  const result = await dispatchSowEmail(id, { createdBy: auth.user.id })
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Email failed' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    issued: !issueResult.already_issued,
    recipient: result.recipient,
    message_id: result.message_id,
  })
}
