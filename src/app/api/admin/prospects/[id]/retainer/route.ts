// ── /api/admin/prospects/[id]/retainer ────────────────────────────────────
// GET   → retainer summary for a client (ledger + pending queue + history),
//         or { ledger: null } if the client has no retainer (opt-in).
// POST  → open a retainer ledger for this client (idempotent — returns the
//         existing one if already open). Body: { notify_pct?, reup_pct?,
//         hourly_rate_cents?, reup_target_cents? }.
// PATCH → edit thresholds / rate / auto-reup toggle / reup target.
//
// Spec: docs/superpowers/specs/2026-07-16-retainer-ledger-design.md

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getOrCreateLedger, getRetainerSummary } from '@/lib/retainer-ledger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const summary = await getRetainerSummary(id)
  if (!summary) return NextResponse.json({ ledger: null })
  return NextResponse.json(summary)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json().catch(() => ({}))) as {
    notify_pct?: number
    reup_pct?: number
    hourly_rate_cents?: number
    reup_target_cents?: number
  }

  const ledger = await getOrCreateLedger(id, {
    notify_pct: body.notify_pct,
    reup_pct: body.reup_pct,
  })

  // Apply optional rate / reup target on open.
  const patch: Record<string, unknown> = {}
  if (typeof body.hourly_rate_cents === 'number') patch.hourly_rate_cents = body.hourly_rate_cents
  if (typeof body.reup_target_cents === 'number') patch.reup_target_cents = body.reup_target_cents
  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString()
    await supabaseAdmin.from('retainer_ledgers').update(patch).eq('id', ledger.id)
  }

  const summary = await getRetainerSummary(id)
  return NextResponse.json(summary)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = (await request.json().catch(() => null)) as {
    notify_pct?: number
    reup_pct?: number
    hourly_rate_cents?: number | null
    reup_target_cents?: number | null
    auto_reup_enabled?: boolean
    status?: 'active' | 'closed'
    notes?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { data: ledger } = await supabaseAdmin
    .from('retainer_ledgers')
    .select('id')
    .eq('prospect_id', id)
    .maybeSingle()
  if (!ledger) return NextResponse.json({ error: 'No retainer ledger for this client' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.notify_pct === 'number') {
    if (body.notify_pct < 1 || body.notify_pct > 100)
      return NextResponse.json({ error: 'notify_pct must be 1–100' }, { status: 400 })
    patch.notify_pct = body.notify_pct
  }
  if (typeof body.reup_pct === 'number') {
    if (body.reup_pct < 1 || body.reup_pct > 100)
      return NextResponse.json({ error: 'reup_pct must be 1–100' }, { status: 400 })
    patch.reup_pct = body.reup_pct
  }
  if (body.hourly_rate_cents !== undefined) patch.hourly_rate_cents = body.hourly_rate_cents
  if (body.reup_target_cents !== undefined) patch.reup_target_cents = body.reup_target_cents
  if (typeof body.auto_reup_enabled === 'boolean') patch.auto_reup_enabled = body.auto_reup_enabled
  if (body.status === 'active' || body.status === 'closed') patch.status = body.status
  if (body.notes !== undefined) patch.notes = body.notes

  const { error } = await supabaseAdmin.from('retainer_ledgers').update(patch).eq('id', ledger.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const summary = await getRetainerSummary(id)
  return NextResponse.json(summary)
}
