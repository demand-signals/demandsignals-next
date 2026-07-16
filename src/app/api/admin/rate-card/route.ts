// ── /api/admin/rate-card ──────────────────────────────────────────────────
// GET   → { roles: RateCardRole[], markups: RateCardMarkup[] } (all, incl. inactive)
// PATCH → update a role rate or a markup tier.
//         Body: { kind: 'role', key, hourly_rate_cents?, name?, when_applied?,
//                 active?, sort_order? }
//            or: { kind: 'markup', key, markup_bps?, name?, description?,
//                 active?, sort_order? }
//
// The rate card is the single source of truth for human role rates + disclosed
// markup tiers. The raw LLM cost basis is NOT here (stays in llm-rates.json).
//
// Spec: docs/superpowers/specs/2026-07-16-retainer-ledger-design.md

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const [{ data: roles }, { data: markups }] = await Promise.all([
    supabaseAdmin.from('rate_card_roles').select('*').order('sort_order', { ascending: true }),
    supabaseAdmin.from('rate_card_markups').select('*').order('sort_order', { ascending: true }),
  ])

  return NextResponse.json({ roles: roles ?? [], markups: markups ?? [] })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = (await request.json().catch(() => null)) as {
    kind?: 'role' | 'markup'
    key?: string
    hourly_rate_cents?: number
    markup_bps?: number
    name?: string
    when_applied?: string
    description?: string
    active?: boolean
    sort_order?: number
  } | null
  if (!body?.kind || !body.key) {
    return NextResponse.json({ error: 'kind and key required' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.kind === 'role') {
    if (typeof body.hourly_rate_cents === 'number') {
      if (body.hourly_rate_cents < 0)
        return NextResponse.json({ error: 'hourly_rate_cents must be >= 0' }, { status: 400 })
      patch.hourly_rate_cents = Math.round(body.hourly_rate_cents)
    }
    if (typeof body.name === 'string') patch.name = body.name.slice(0, 200)
    if (typeof body.when_applied === 'string') patch.when_applied = body.when_applied.slice(0, 1000)
    if (typeof body.active === 'boolean') patch.active = body.active
    if (typeof body.sort_order === 'number') patch.sort_order = body.sort_order

    const { data, error } = await supabaseAdmin
      .from('rate_card_roles')
      .update(patch)
      .eq('key', body.key)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ role: data })
  }

  if (body.kind === 'markup') {
    if (typeof body.markup_bps === 'number') {
      if (body.markup_bps < 0)
        return NextResponse.json({ error: 'markup_bps must be >= 0' }, { status: 400 })
      patch.markup_bps = Math.round(body.markup_bps)
    }
    if (typeof body.name === 'string') patch.name = body.name.slice(0, 200)
    if (typeof body.description === 'string') patch.description = body.description.slice(0, 1000)
    if (typeof body.active === 'boolean') patch.active = body.active
    if (typeof body.sort_order === 'number') patch.sort_order = body.sort_order

    const { data, error } = await supabaseAdmin
      .from('rate_card_markups')
      .update(patch)
      .eq('key', body.key)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ markup: data })
  }

  return NextResponse.json({ error: `unknown kind '${body.kind}'` }, { status: 400 })
}
