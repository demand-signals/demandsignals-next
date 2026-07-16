// ── POST /api/admin/retainer-transactions/[id] ────────────────────────────
// Admin action on a retainer transaction (usually a pending debit).
// Body: { action: 'approve' | 'waive' | 'void', reason?: string,
//         amount_cents?: number, hours?: number, description?: string }
//
//   approve → posts the debit; edits (amount_cents/hours/description) applied first
//   waive   → "on our dime": logged, never charged. reason required.
//   void    → wrong/duplicate entry; removes from balance. reason required.
//
// Spec: docs/superpowers/specs/2026-07-16-retainer-ledger-design.md §4

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { approveTransaction, waiveTransaction, voidTransaction } from '@/lib/retainer-ledger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const actor = (auth as { user?: { email?: string } }).user?.email ?? 'admin'

  const body = (await request.json().catch(() => null)) as {
    action?: 'approve' | 'waive' | 'void'
    reason?: string
    amount_cents?: number
    hours?: number | null
    description?: string
    role?: string | null
  } | null
  if (!body?.action) {
    return NextResponse.json({ error: 'action required (approve|waive|void)' }, { status: 400 })
  }

  try {
    if (body.action === 'approve') {
      const edits: {
        amount_cents?: number
        hours?: number | null
        description?: string
        role?: string | null
      } = {}
      if (typeof body.amount_cents === 'number') {
        if (body.amount_cents <= 0)
          return NextResponse.json({ error: 'amount_cents must be positive' }, { status: 400 })
        edits.amount_cents = Math.round(body.amount_cents)
      }
      if (body.hours !== undefined) edits.hours = body.hours
      if (typeof body.description === 'string') edits.description = body.description.slice(0, 500)
      if (body.role !== undefined) edits.role = body.role
      const tx = await approveTransaction(id, actor, Object.keys(edits).length ? edits : undefined)
      return NextResponse.json({ transaction: tx })
    }

    if (body.action === 'waive') {
      if (!body.reason?.trim())
        return NextResponse.json({ error: 'reason required to waive' }, { status: 400 })
      const tx = await waiveTransaction(id, actor, body.reason.slice(0, 500))
      return NextResponse.json({ transaction: tx })
    }

    if (body.action === 'void') {
      if (!body.reason?.trim())
        return NextResponse.json({ error: 'reason required to void' }, { status: 400 })
      const tx = await voidTransaction(id, actor, body.reason.slice(0, 500))
      return NextResponse.json({ transaction: tx })
    }

    return NextResponse.json({ error: `unknown action '${body.action}'` }, { status: 400 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'action failed' },
      { status: 500 },
    )
  }
}
