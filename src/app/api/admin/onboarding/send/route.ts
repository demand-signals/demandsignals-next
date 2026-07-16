// ── POST /api/admin/onboarding/send ──────────────────────────────────
// The [Send Onboarding Docs] action. Sends the client-specific MSA +
// incorporated disclosures (the "onboarding kit") to a prospect, in
// isolation — before, during, or after any SOW/project. Dispatches via
// BOTH email and SMS. Decoupled: requires only a prospect_id.

export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendOnboardingDocs } from '@/lib/msa-send'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let body: { prospect_id?: string; force?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.prospect_id) {
    return NextResponse.json({ error: 'prospect_id required' }, { status: 400 })
  }

  const result = await sendOnboardingDocs(body.prospect_id, {
    createdBy: auth.user.id,
    force: body.force,
  })

  if (!result.success && !result.already_executed) {
    return NextResponse.json(
      { error: result.error ?? 'Onboarding send failed', detail: result },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    already_executed: result.already_executed ?? false,
    msa_number: result.msa_number,
    email: result.email,
    sms: result.sms,
  })
}
