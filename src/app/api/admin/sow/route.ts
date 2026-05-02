// ── /api/admin/sow — list + create ──────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import type { SowDeliverable, SowPricing } from '@/lib/invoice-types'

// ── Phases shape (new client format) ────────────────────────────────

const phaseDeliverableSchema = z.object({
  id: z.string(),
  service_id: z.string().nullable().optional(),
  name: z.string().default(''),
  description: z.string().default(''),
  cadence: z.enum(['one_time', 'monthly', 'quarterly', 'annual']).default('one_time'),
  quantity: z.number().int().min(0).optional(),
  hours: z.number().nonnegative().nullable().optional(),
  unit_price_cents: z.number().int().nonnegative().optional(),
  line_total_cents: z.number().int().nonnegative().optional(),
  start_trigger: z.object({
    type: z.enum(['on_phase_complete', 'date']),
    phase_id: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
  }).optional(),
})

const phaseSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  deliverables: z.array(phaseDeliverableSchema).default([]),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  const prospectId = sp.get('prospect_id')

  let q = supabaseAdmin
    .from('sow_documents')
    .select('id, sow_number, title, status, pricing, phases, prospect_id, quote_session_id, created_at, sent_at, viewed_at, accepted_at, prospects(business_name)')
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  if (prospectId) q = q.eq('prospect_id', prospectId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Per-row split: $ Project (one-time deliverables) + $ Subscriptions
  // (monthly + quarterly + annual at full per-cycle price). Walk the
  // phases jsonb to derive these from deliverables. Old rows lacking
  // phases fall back to pricing.total_cents in the project column.
  type Deliverable = { cadence?: string; line_total_cents?: number }
  type Phase = { deliverables?: Deliverable[] }
  const enriched = (data ?? []).map((row) => {
    const phases = ((row as unknown as { phases?: Phase[] | null }).phases ?? []) as Phase[]
    let oneTimeCents = 0
    let recurringCents = 0
    if (Array.isArray(phases) && phases.length > 0) {
      for (const ph of phases) {
        for (const d of (ph.deliverables ?? [])) {
          const v = d.line_total_cents ?? 0
          if (d.cadence === 'monthly' || d.cadence === 'quarterly' || d.cadence === 'annual') {
            recurringCents += v
          } else {
            oneTimeCents += v
          }
        }
      }
    } else {
      // Legacy SOWs (pre-phases) — only have pricing.total_cents. Best
      // effort: bucket the whole thing into project so admin still sees
      // a non-zero number rather than a confusing $0.
      const pricing = (row as unknown as { pricing?: { total_cents?: number } }).pricing
      oneTimeCents = pricing?.total_cents ?? 0
    }
    const totalCents = oneTimeCents + recurringCents
    return { ...row, project_cents: oneTimeCents, subscriptions_cents: recurringCents, computed_total_cents: totalCents }
  })

  return NextResponse.json({ sows: enriched })
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
  prospect_id: z.string().nullable().optional(),
  quote_session_id: z.string().optional(),
  scope_summary: z.string().nullable().optional(),
  deliverables: z.array(deliverableSchema).optional(),
  timeline: z.array(timelinePhaseSchema).optional(),
  phases: z.array(phaseSchema).optional(),
  pricing: pricingSchema,
  payment_terms: z.string().nullable().optional(),
  guarantees: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  computed_from_deliverables: z.boolean().optional(),
  send_date: z.string().nullable().optional(), // ISO date string
  trade_credit_cents: z.number().int().nonnegative().optional(),
  trade_credit_description: z.string().nullable().optional(),
  cover_eyebrow: z.string().nullable().optional(),
  cover_tagline: z.string().nullable().optional(),
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
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Invalid request body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const {
    title,
    prospect_id,
    quote_session_id,
    scope_summary,
    deliverables,
    timeline,
    phases,
    pricing,
    payment_terms,
    guarantees,
    notes,
    computed_from_deliverables,
    send_date,
    trade_credit_cents,
    trade_credit_description,
    cover_eyebrow,
    cover_tagline,
  } = parsed

  // If phases present, compute total from one_time deliverables when client didn't supply one.
  const computedTotalFromPhases = phases
    ? phases.flatMap(p => p.deliverables)
        .filter(d => d.cadence === 'one_time')
        .reduce((sum, d) => sum + (d.line_total_cents ?? 0), 0)
    : undefined

  const resolvedTotal = pricing.total_cents || computedTotalFromPhases || 0

  // Default deposit = 25% if not specified.
  const finalPricing: SowPricing = {
    total_cents: resolvedTotal,
    deposit_cents: pricing.deposit_cents ?? Math.round(resolvedTotal * 0.25),
    deposit_pct: pricing.deposit_pct ?? 25,
    payment_schedule: pricing.payment_schedule,
  }

  // Compute line_total_cents per legacy deliverable.
  const finalDeliverables: SowDeliverable[] = (deliverables ?? []).map(computeLineTotal)

  // ── New numbering: TYPE-CLIENT-MMDDYY{SUFFIX} ───────────────────────
  // If the SOW has a prospect with a client_code, allocate a new-format
  // number (SOW-HANG-042326A). Otherwise fall back to legacy generate_sow_number().
  // Flow: insert with temp placeholder → allocate number → update row.
  // On allocation failure we roll back the SOW row so no PENDING leaks.

  const tempNumber = `PENDING-${crypto.randomUUID()}`

  const { data: sow, error } = await supabaseAdmin
    .from('sow_documents')
    .insert({
      sow_number: tempNumber,
      prospect_id: prospect_id ?? null,
      quote_session_id: quote_session_id ?? null,
      status: 'draft',
      title,
      scope_summary: scope_summary ?? null,
      deliverables: finalDeliverables,
      timeline: timeline ?? [],
      phases: phases ?? null,
      pricing: finalPricing,
      payment_terms: payment_terms ?? null,
      guarantees: guarantees ?? null,
      notes: notes ?? null,
      computed_from_deliverables: computed_from_deliverables ?? null,
      // Default issue date to today (admin can edit afterward).
      send_date: send_date ?? new Date().toISOString().slice(0, 10),
      trade_credit_cents: trade_credit_cents ?? 0,
      trade_credit_description: trade_credit_description ?? null,
      cover_eyebrow: cover_eyebrow ?? null,
      cover_tagline: cover_tagline ?? null,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attempt new-format numbering when prospect is linked.
  if (sow.prospect_id) {
    try {
      const sowNumber = await allocateDocNumber({
        doc_type: 'SOW',
        prospect_id: sow.prospect_id,
        ref_table: 'sow_documents',
        ref_id: sow.id,
      })
      await supabaseAdmin.from('sow_documents').update({ sow_number: sowNumber }).eq('id', sow.id)
      sow.sow_number = sowNumber
    } catch (numErr) {
      // Roll back the SOW row so we don't leak a PENDING record.
      await supabaseAdmin.from('sow_documents').delete().eq('id', sow.id)
      return NextResponse.json(
        { error: numErr instanceof Error ? numErr.message : 'Numbering failed' },
        { status: 400 },
      )
    }
  } else {
    // No prospect linked — fall back to legacy sequential number.
    const { data: legacyNum, error: numErr } = await supabaseAdmin.rpc('generate_sow_number')
    if (numErr || !legacyNum) {
      await supabaseAdmin.from('sow_documents').delete().eq('id', sow.id)
      return NextResponse.json(
        { error: `Number generation: ${numErr?.message}` },
        { status: 500 },
      )
    }
    await supabaseAdmin.from('sow_documents').update({ sow_number: legacyNum }).eq('id', sow.id)
    sow.sow_number = legacyNum
  }

  return NextResponse.json({ sow })
}
