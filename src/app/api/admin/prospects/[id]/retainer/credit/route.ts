// ── POST /api/admin/prospects/[id]/retainer/credit ────────────────────────
// Manually add funds to a client's retainer ("money on the books" — a check
// or wire received outside Stripe). Posts an APPROVED credit immediately
// (the money is real) and recomputes the balance.
//
// Body: { amount_cents: number, description?: string }
//
// For Stripe/invoice-driven credits, the paid-invoice → credit path is
// automatic (see the mark-paid hook); use this only for off-platform funds.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getOrCreateLedger, postTransaction } from '@/lib/retainer-ledger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const actor = (auth as { user?: { email?: string } }).user?.email ?? 'admin'

  const body = (await request.json().catch(() => null)) as {
    amount_cents?: number
    description?: string
  } | null
  if (!body || typeof body.amount_cents !== 'number' || body.amount_cents <= 0) {
    return NextResponse.json({ error: 'amount_cents must be a positive number' }, { status: 400 })
  }

  const ledger = await getOrCreateLedger(id)
  const tx = await postTransaction({
    ledger_id: ledger.id,
    prospect_id: id,
    direction: 'credit',
    amount_cents: Math.round(body.amount_cents),
    source: 'manual_credit',
    description: body.description?.slice(0, 500) || 'Manual retainer credit',
    approved: true, // real money → posts approved
    actor,
  })

  return NextResponse.json({ transaction: tx })
}
