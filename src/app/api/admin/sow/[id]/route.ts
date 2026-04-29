// ── /api/admin/sow/[id] — detail + update + delete ──────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SowDeliverable } from '@/lib/invoice-types'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(*), session:quote_sessions(*), deposit_invoice:invoices!sow_documents_deposit_invoice_id_fkey(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ sow: data })
}

// ── PATCH body schema ────────────────────────────────────────────────

const patchDeliverableSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  acceptance_criteria: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  hours: z.number().nonnegative().optional(),
  unit_price_cents: z.number().int().nonnegative().optional(),
})

const patchBodySchema = z.object({
  title: z.string().min(1).optional(),
  scope_summary: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  guarantees: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  send_date: z.string().nullable().optional(),
  computed_from_deliverables: z.boolean().optional(),
  deliverables: z.array(patchDeliverableSchema).optional(),
  timeline: z.array(z.object({
    name: z.string().min(1),
    duration_weeks: z.number(),
    description: z.string().optional().default(''),
    deliverables: z.array(z.string()).optional(),
  })).optional(),
  phases: z.array(phaseSchema).optional(),
  pricing: z.object({
    total_cents: z.number().int(),
    deposit_cents: z.number().int().optional(),
    deposit_pct: z.number().optional(),
  }).optional(),
  force_edit: z.boolean().optional(),
  trade_credit_cents: z.number().int().nonnegative().optional(),
  trade_credit_description: z.string().nullable().optional(),
  // Document-level discount (migration 036). Send null to clear the
  // kind. Value fields stay non-negative and bounded.
  discount_kind: z.enum(['percent', 'amount']).nullable().optional(),
  discount_value_bps: z.number().int().min(0).max(10000).optional(),
  discount_amount_cents: z.number().int().nonnegative().optional(),
  discount_description: z.string().nullable().optional(),
  cover_eyebrow: z.string().nullable().optional(),
  cover_tagline: z.string().nullable().optional(),
})

function computeLineTotal(d: z.infer<typeof patchDeliverableSchema>): SowDeliverable {
  const line_total_cents =
    d.unit_price_cents !== undefined
      ? Math.round((d.hours ?? d.quantity ?? 1) * d.unit_price_cents)
      : undefined
  return { ...d, line_total_cents }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('sow_documents')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let parsed: z.infer<typeof patchBodySchema>
  try {
    parsed = patchBodySchema.parse(await request.json())
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Invalid request body'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { force_edit, ...fields } = parsed

  if (existing.status !== 'draft' && force_edit !== true) {
    return NextResponse.json(
      {
        error: `Cannot edit SOW in status ${existing.status}. Pass force_edit: true to override.`,
      },
      { status: 409 },
    )
  }

  // Build selective update — only include keys that were present in the body.
  const updates: Record<string, unknown> = {}

  if (fields.title !== undefined) updates.title = fields.title
  if (fields.scope_summary !== undefined) updates.scope_summary = fields.scope_summary
  if (fields.payment_terms !== undefined) updates.payment_terms = fields.payment_terms
  if (fields.guarantees !== undefined) updates.guarantees = fields.guarantees
  if (fields.notes !== undefined) updates.notes = fields.notes
  if (fields.send_date !== undefined) updates.send_date = fields.send_date
  if (fields.computed_from_deliverables !== undefined) {
    updates.computed_from_deliverables = fields.computed_from_deliverables
  }
  if (fields.timeline !== undefined) updates.timeline = fields.timeline
  if (fields.phases !== undefined) updates.phases = fields.phases
  if (fields.pricing !== undefined) updates.pricing = fields.pricing
  if (fields.deliverables !== undefined) {
    updates.deliverables = fields.deliverables.map(computeLineTotal)
  }
  if (fields.trade_credit_cents !== undefined) updates.trade_credit_cents = fields.trade_credit_cents
  if (fields.trade_credit_description !== undefined) updates.trade_credit_description = fields.trade_credit_description
  if (fields.discount_kind !== undefined) updates.discount_kind = fields.discount_kind
  if (fields.discount_value_bps !== undefined) updates.discount_value_bps = fields.discount_value_bps
  if (fields.discount_amount_cents !== undefined) updates.discount_amount_cents = fields.discount_amount_cents
  if (fields.discount_description !== undefined) updates.discount_description = fields.discount_description
  if (fields.cover_eyebrow !== undefined) updates.cover_eyebrow = fields.cover_eyebrow
  if (fields.cover_tagline !== undefined) updates.cover_tagline = fields.cover_tagline

  const { error } = await supabaseAdmin
    .from('sow_documents')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('sow_documents')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Can only delete drafts' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin.from('sow_documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
