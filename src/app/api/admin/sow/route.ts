// ── /api/admin/sow — list + create ──────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SowDeliverable, SowTimelinePhase, SowPricing } from '@/lib/invoice-types'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  const prospectId = sp.get('prospect_id')

  let q = supabaseAdmin
    .from('sow_documents')
    .select('id, sow_number, title, status, pricing, prospect_id, created_at, sent_at, accepted_at, prospects(business_name)')
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  if (prospectId) q = q.eq('prospect_id', prospectId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sows: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    title,
    prospect_id,
    quote_session_id,
    scope_summary,
    deliverables,
    timeline,
    pricing,
    payment_terms,
    guarantees,
    notes,
  }: {
    title: string
    prospect_id?: string
    quote_session_id?: string
    scope_summary?: string
    deliverables?: SowDeliverable[]
    timeline?: SowTimelinePhase[]
    pricing: SowPricing
    payment_terms?: string
    guarantees?: string
    notes?: string
  } = body

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  if (!pricing || typeof pricing.total_cents !== 'number') {
    return NextResponse.json({ error: 'pricing.total_cents required' }, { status: 400 })
  }

  // Default deposit = 25% if not specified.
  const finalPricing: SowPricing = {
    total_cents: pricing.total_cents,
    deposit_cents: pricing.deposit_cents ?? Math.round(pricing.total_cents * 0.25),
    deposit_pct: pricing.deposit_pct ?? 25,
    payment_schedule: pricing.payment_schedule,
  }

  const { data: numResult, error: numErr } = await supabaseAdmin.rpc('generate_sow_number')
  if (numErr || !numResult) {
    return NextResponse.json(
      { error: `Number generation: ${numErr?.message}` },
      { status: 500 },
    )
  }

  const { data: sow, error } = await supabaseAdmin
    .from('sow_documents')
    .insert({
      sow_number: numResult,
      prospect_id: prospect_id ?? null,
      quote_session_id: quote_session_id ?? null,
      status: 'draft',
      title,
      scope_summary: scope_summary ?? null,
      deliverables: deliverables ?? [],
      timeline: timeline ?? [],
      pricing: finalPricing,
      payment_terms: payment_terms ?? 'Net 30. 25% deposit on acceptance; remainder on delivery.',
      guarantees: guarantees ?? null,
      notes: notes ?? null,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sow })
}
