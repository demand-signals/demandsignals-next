// ── POST /api/admin/prospects/[id]/retainer/debit ─────────────────────────
// Manually record a debit against a client's retainer (work not sourced from
// a handoff — e.g. an out-of-band task, a third-party cost passed through).
// Posts as PENDING by default (admin approval workflow); pass approved=true
// to post it straight to the balance.
//
// Body: { amount_cents: number, description: string,
//         project_id?: string, hours?: number, approved?: boolean }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLedger, postTransaction } from '@/lib/retainer-ledger'

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
    project_id?: string
    hours?: number
    approved?: boolean
  } | null
  if (!body || typeof body.amount_cents !== 'number' || body.amount_cents <= 0) {
    return NextResponse.json({ error: 'amount_cents must be a positive number' }, { status: 400 })
  }
  if (!body.description || typeof body.description !== 'string') {
    return NextResponse.json({ error: 'description required' }, { status: 400 })
  }

  const ledger = await getLedger(id)
  if (!ledger) {
    return NextResponse.json({ error: 'No retainer ledger for this client' }, { status: 404 })
  }

  const tx = await postTransaction({
    ledger_id: ledger.id,
    prospect_id: id,
    project_id: typeof body.project_id === 'string' ? body.project_id : null,
    direction: 'debit',
    amount_cents: Math.round(body.amount_cents),
    source: 'manual_debit',
    description: body.description.slice(0, 500),
    hours: typeof body.hours === 'number' ? body.hours : null,
    approved: body.approved === true,
    actor,
  })

  return NextResponse.json({ transaction: tx })
}
