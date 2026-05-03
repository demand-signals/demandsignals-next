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
  // Back-cover quote seed (migration 044). NULL clears the override (PDF
  // falls back to sow_number-derived quote). Any other string is hashed
  // via FNV-1a to pick a quote, OR if it matches 'quote:N' it's a
  // direct-index sentinel into BACK_COVER_QUOTES.
  quote_seed: z.string().nullable().optional(),
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
  if (fields.quote_seed !== undefined) updates.quote_seed = fields.quote_seed

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

  // ?force=1 unlocks deletion of non-draft SOWs along with their dependent
  // rows (deposit invoice, receipts, credit_memos, trade_credits + drawdowns,
  // R2 PDF). Required because non-draft SOWs are usually real client docs;
  // delete is destructive and irreversible. UI must double-confirm before
  // setting force=1.
  //
  // Cascade order matches scripts/delete-test-sows.mjs (verified against
  // migrations 011/012d/019/025/032):
  //   1. credit_memos → invoice (RESTRICT)
  //   2. receipts → invoice (RESTRICT)
  //   3. trade_credit_drawdowns → trade_credit (CASCADE; explicit anyway)
  //   4. trade_credits → sow (would SET NULL but we want them gone)
  //   5. invoices (cascades line_items, delivery_log, email_log,
  //      scheduled_sends; sets sow_documents.deposit_invoice_id NULL)
  //   6. sow_documents (cascades sow_scheduled_sends, payment_schedules)
  //   7. R2 PDF (best-effort)
  const force = request.nextUrl.searchParams.get('force') === '1'

  const { data: existing } = await supabaseAdmin
    .from('sow_documents')
    .select('id, status, sow_number, deposit_invoice_id, pdf_storage_path')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing.status !== 'draft' && !force) {
    return NextResponse.json(
      { error: 'Can only delete drafts. Pass ?force=1 to delete a non-draft SOW (this also removes its deposit invoice, receipts, credit memos, and trade credits).' },
      { status: 409 },
    )
  }

  // For drafts we can use the simple path — no dependents in play yet.
  if (existing.status === 'draft' && !force) {
    const { error } = await supabaseAdmin.from('sow_documents').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Force-delete cascade. Each stage is best-effort within the transaction
  // semantics PostgREST gives us — if any FK fails, we surface the error so
  // the admin can inspect manually.
  const cleanup = {
    credit_memos: 0,
    receipts: 0,
    trade_credit_drawdowns: 0,
    trade_credits: 0,
    invoice_deleted: false,
    sow_deleted: false,
    r2_deleted: false,
    r2_error: null as string | null,
  }

  // Resolve trade credits attached to this SOW (need them to delete drawdowns).
  const { data: tcs } = await supabaseAdmin
    .from('trade_credits')
    .select('id')
    .eq('sow_document_id', id)
  const tcIds = (tcs ?? []).map((t) => t.id)

  if (existing.deposit_invoice_id) {
    // 1. credit_memos
    const { data: memos, error: memoErr } = await supabaseAdmin
      .from('credit_memos')
      .delete()
      .eq('invoice_id', existing.deposit_invoice_id)
      .select('id')
    if (memoErr) return NextResponse.json({ error: `credit_memos: ${memoErr.message}` }, { status: 500 })
    cleanup.credit_memos = memos?.length ?? 0

    // 2. receipts
    const { data: rcts, error: rctErr } = await supabaseAdmin
      .from('receipts')
      .delete()
      .eq('invoice_id', existing.deposit_invoice_id)
      .select('id')
    if (rctErr) return NextResponse.json({ error: `receipts: ${rctErr.message}` }, { status: 500 })
    cleanup.receipts = rcts?.length ?? 0
  }

  if (tcIds.length > 0) {
    // 3. drawdowns (explicit even though CASCADE would handle them)
    const { data: dds, error: ddErr } = await supabaseAdmin
      .from('trade_credit_drawdowns')
      .delete()
      .in('trade_credit_id', tcIds)
      .select('id')
    if (ddErr) return NextResponse.json({ error: `trade_credit_drawdowns: ${ddErr.message}` }, { status: 500 })
    cleanup.trade_credit_drawdowns = dds?.length ?? 0

    // 4. trade_credits
    const { data: delTc, error: tcErr } = await supabaseAdmin
      .from('trade_credits')
      .delete()
      .in('id', tcIds)
      .select('id')
    if (tcErr) return NextResponse.json({ error: `trade_credits: ${tcErr.message}` }, { status: 500 })
    cleanup.trade_credits = delTc?.length ?? 0
  }

  // 5. invoice (sets sow.deposit_invoice_id = NULL via FK)
  if (existing.deposit_invoice_id) {
    const { error: invErr } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('id', existing.deposit_invoice_id)
    if (invErr) return NextResponse.json({ error: `invoice: ${invErr.message}` }, { status: 500 })
    cleanup.invoice_deleted = true
  }

  // 6. SOW
  const { error: sowErr } = await supabaseAdmin.from('sow_documents').delete().eq('id', id)
  if (sowErr) return NextResponse.json({ error: `sow: ${sowErr.message}` }, { status: 500 })
  cleanup.sow_deleted = true

  // 7. R2 PDF (best-effort — orphan blob is cheap, never roll back over it)
  if (existing.pdf_storage_path) {
    try {
      const { deletePrivate } = await import('@/lib/r2-storage')
      await deletePrivate(existing.pdf_storage_path)
      cleanup.r2_deleted = true
    } catch (e) {
      cleanup.r2_error = e instanceof Error ? e.message : String(e)
      console.warn(`[DELETE sow ${existing.sow_number}] R2 delete failed:`, cleanup.r2_error)
    }
  }

  return NextResponse.json({ ok: true, cleanup })
}
