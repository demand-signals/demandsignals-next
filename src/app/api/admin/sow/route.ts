// ── /api/admin/sow — list + create ──────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SowDeliverable, SowPricing } from '@/lib/invoice-types'

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

const deliverableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  acceptance_criteria: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  hours: z.number().nonnegative().optional(),
  unit_price_cents: z.number().int().nonnegative().optional(),
})

const timelinePhaseSchema = z.object({
  name: z.string().min(1),
  duration_weeks: z.number(),
  description: z.string(),
  deliverables: z.array(z.string()).optional(),
})

const pricingSchema = z.object({
  total_cents: z.number().int(),
  deposit_cents: z.number().int().optional(),
  deposit_pct: z.number().optional(),
  payment_schedule: z.array(z.object({
    milestone: z.string(),
    amount_cents: z.number().int(),
    due_at: z.string(),
  })).optional(),
})

const postBodySchema = z.object({
  title: z.string().min(1),
  prospect_id: z.string().optional(),
  quote_session_id: z.string().optional(),
  scope_summary: z.string().optional(),
  deliverables: z.array(deliverableSchema).optional(),
  timeline: z.array(timelinePhaseSchema).optional(),
  pricing: pricingSchema,
  payment_terms: z.string().optional(),
  guarantees: z.string().optional(),
  notes: z.string().optional(),
  computed_from_deliverables: z.boolean().optional(),
  send_date: z.string().optional(), // ISO date string
})

function computeLineTotal(d: z.infer<typeof deliverableSchema>): SowDeliverable {
  const line_total_cents =
    d.unit_price_cents !== undefined
      ? Math.round((d.hours ?? d.quantity ?? 1) * d.unit_price_cents)
      : undefined
  return { ...d, line_total_cents }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let parsed: z.infer<typeof postBodySchema>
  try {
    parsed = postBodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

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
    computed_from_deliverables,
    send_date,
  } = parsed

  // Default deposit = 25% if not specified.
  const finalPricing: SowPricing = {
    total_cents: pricing.total_cents,
    deposit_cents: pricing.deposit_cents ?? Math.round(pricing.total_cents * 0.25),
    deposit_pct: pricing.deposit_pct ?? 25,
    payment_schedule: pricing.payment_schedule,
  }

  // Compute line_total_cents per deliverable.
  const finalDeliverables: SowDeliverable[] = (deliverables ?? []).map(computeLineTotal)

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
      deliverables: finalDeliverables,
      timeline: timeline ?? [],
      pricing: finalPricing,
      payment_terms: payment_terms ?? 'Net 30. 25% deposit on acceptance; remainder on delivery.',
      guarantees: guarantees ?? null,
      notes: notes ?? null,
      computed_from_deliverables: computed_from_deliverables ?? null,
      send_date: send_date ?? null,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sow })
}
