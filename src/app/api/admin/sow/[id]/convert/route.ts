// ── POST /api/admin/sow/[id]/convert ────────────────────────────────
// Admin-initiated SOW → Project conversion.
// Body: ConvertSowRequest (see payment-plan-types.ts).
// Returns: ConvertSowResult.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  convertSowToProject,
  PaymentPlanValidationError,
} from '@/lib/payment-plans'
import type { ConvertSowRequest } from '@/lib/payment-plan-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json().catch(() => null)) as ConvertSowRequest | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.acceptance?.signed_by || !body.acceptance?.accepted_at) {
    return NextResponse.json(
      { error: 'acceptance.signed_by and acceptance.accepted_at are required' },
      { status: 400 },
    )
  }
  if (!Array.isArray(body.payment_plan)) {
    return NextResponse.json({ error: 'payment_plan must be an array' }, { status: 400 })
  }
  if (!Array.isArray(body.subscriptions)) {
    return NextResponse.json({ error: 'subscriptions must be an array' }, { status: 400 })
  }

  try {
    const result = await convertSowToProject(id, body)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof PaymentPlanValidationError) {
      return NextResponse.json({ error: e.message, kind: 'validation' }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), kind: 'internal' },
      { status: 500 },
    )
  }
}
