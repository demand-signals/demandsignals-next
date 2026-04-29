// ── GET /api/admin/invoices — list ──────────────────────────────────
// ── POST /api/admin/invoices — create draft ─────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CATALOG_VERSION } from '@/lib/quote-pricing'
import { allocateDocNumber } from '@/lib/doc-numbering'
import type { InvoiceKind, CategoryHint } from '@/lib/invoice-types'

interface CreateLineItem {
  catalog_item_id?: string
  description?: string
  quantity: number
  unit_price_cents?: number
  discount_pct?: number
  discount_label?: string
  use_display_price?: boolean
}

const VALID_KINDS: readonly InvoiceKind[] = [
  'quote_driven',
  'business',
  'subscription_cycle',
  'restaurant_rule',
]

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  const kind = sp.get('kind')
  const prospectId = sp.get('prospect_id')
  const autoOnly = sp.get('auto_generated') === 'true'
  const search = sp.get('search')
  const limit = Math.min(parseInt(sp.get('limit') || '50'), 200)
  const offset = parseInt(sp.get('offset') || '0')

  let q = supabaseAdmin
    .from('invoices')
    .select(
      'id, invoice_number, kind, prospect_id, status, total_due_cents, currency, auto_generated, auto_trigger, created_at, sent_at, paid_at, stripe_payment_link_url, prospects(business_name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)
  if (kind) q = q.eq('kind', kind)
  if (prospectId) q = q.eq('prospect_id', prospectId)
  if (autoOnly) q = q.eq('auto_generated', true)
  if (search) q = q.or(`invoice_number.ilike.%${search}%`)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data ?? [], total: count ?? 0, limit, offset })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    kind,
    prospect_id,
    quote_session_id,
    subscription_id,
    line_items,
    notes,
    due_date,
    send_date,
    late_fee_cents,
    late_fee_grace_days,
    category_hint,
    trade_credit_cents,
    trade_credit_description,
    discount_kind,
    discount_value_bps,
    discount_amount_cents,
    discount_description,
  }: {
    kind?: InvoiceKind
    prospect_id?: string
    quote_session_id?: string
    subscription_id?: string
    line_items: CreateLineItem[]
    notes?: string
    due_date?: string
    send_date?: string
    late_fee_cents?: number
    late_fee_grace_days?: number
    category_hint?: CategoryHint
    trade_credit_cents?: number
    trade_credit_description?: string | null
    // Document-level discount (migration 036). One-time only. Stacks with TIK.
    discount_kind?: 'percent' | 'amount' | null
    discount_value_bps?: number
    discount_amount_cents?: number
    discount_description?: string | null
  } = body

  const effectiveKind: InvoiceKind = kind ?? (quote_session_id ? 'quote_driven' : 'business')
  if (!VALID_KINDS.includes(effectiveKind)) {
    return NextResponse.json({ error: `Invalid kind: ${effectiveKind}` }, { status: 400 })
  }

  if (!Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: 'At least one line item required' }, { status: 400 })
  }

  // Each line must carry description + unit_price_cents. catalog_item_id
  // is advisory (stored for analytics/traceability) — the form has the
  // authoritative display price from the catalog picker's selection.
  let resolved
  try {
    resolved = line_items.map((li) => {
      if (!li.description) throw new Error('Line item needs description')
      if (typeof li.unit_price_cents !== 'number') {
        throw new Error('Line item needs unit_price_cents')
      }

      const qty = li.quantity || 1
      const unitPrice = li.unit_price_cents
      const subtotal = unitPrice * qty
      const discountPct = li.discount_pct ?? 0
      const discountCents = Math.round((subtotal * discountPct) / 100)
      const lineTotal = subtotal - discountCents

      return {
        description: li.description,
        quantity: qty,
        unit_price_cents: unitPrice,
        subtotal_cents: subtotal,
        discount_pct: discountPct,
        discount_cents: discountCents,
        discount_label: li.discount_label ?? null,
        line_total_cents: lineTotal,
      }
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bad line item' },
      { status: 400 },
    )
  }

  const subtotalCents = resolved.reduce((s, r) => s + Math.max(0, r.subtotal_cents), 0)
  const discountCents = resolved.reduce((s, r) => s + r.discount_cents, 0)
  const lineTotalCents = resolved.reduce((s, r) => s + r.line_total_cents, 0)
  // Document-level discount (migration 036). Applied AFTER line discounts,
  // BEFORE TIK. Same order as SOW: subtotal → line disc → doc disc → TIK.
  const docDiscountCents = (() => {
    if (discount_kind === 'percent') {
      const bps = Math.max(0, Math.min(10000, discount_value_bps ?? 0))
      return Math.min(lineTotalCents, Math.round(lineTotalCents * bps / 10000))
    }
    if (discount_kind === 'amount') {
      return Math.min(lineTotalCents, Math.max(0, discount_amount_cents ?? 0))
    }
    return 0
  })()
  const tikCents = trade_credit_cents ?? 0
  const totalDueCents = Math.max(0, lineTotalCents - docDiscountCents - tikCents)

  // ── New numbering: TYPE-CLIENT-MMDDYY{SUFFIX} ───────────────────────
  // Insert with temp placeholder → allocate number → update row.
  // If prospect has no client_code, fall back to legacy generate_invoice_number().
  // On allocation failure we roll back the invoice row.

  const tempNumber = `PENDING-${crypto.randomUUID()}`

  const { data: inv, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: tempNumber,
      kind: effectiveKind,
      prospect_id: prospect_id ?? null,
      quote_session_id: quote_session_id ?? null,
      subscription_id: subscription_id ?? null,
      status: 'draft',
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_due_cents: totalDueCents,
      currency: 'USD',
      due_date: due_date ?? null,
      // Default issue date to today (admin can edit afterward).
      send_date: send_date ?? new Date().toISOString().slice(0, 10),
      late_fee_cents: late_fee_cents ?? 0,
      late_fee_grace_days: late_fee_grace_days ?? 0,
      category_hint: category_hint ?? (effectiveKind === 'subscription_cycle' ? 'subscription_revenue' : 'service_revenue'),
      notes: notes ?? null,
      trade_credit_cents: tikCents,
      trade_credit_description: trade_credit_description ?? null,
      discount_kind: discount_kind ?? null,
      discount_value_bps: discount_value_bps ?? 0,
      discount_amount_cents: discount_amount_cents ?? 0,
      discount_description: discount_description ?? null,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Allocate document number.
  if (prospect_id) {
    try {
      const invNumber = await allocateDocNumber({
        doc_type: 'INV',
        prospect_id,
        ref_table: 'invoices',
        ref_id: inv.id,
      })
      await supabaseAdmin.from('invoices').update({ invoice_number: invNumber }).eq('id', inv.id)
      inv.invoice_number = invNumber
    } catch (numErr) {
      await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
      return NextResponse.json(
        { error: numErr instanceof Error ? numErr.message : 'Numbering failed' },
        { status: 400 },
      )
    }
  } else {
    // No prospect linked — fall back to legacy sequential number.
    const { data: legacyNum, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
    if (numErr || !legacyNum) {
      await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
      return NextResponse.json(
        { error: `Number generation failed: ${numErr?.message}` },
        { status: 500 },
      )
    }
    await supabaseAdmin.from('invoices').update({ invoice_number: legacyNum }).eq('id', inv.id)
    inv.invoice_number = legacyNum
  }

  const lineInserts = resolved.map((r, idx) => ({
    invoice_id: inv.id,
    sort_order: idx,
    ...r,
  }))
  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(lineInserts)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
    return NextResponse.json({ error: `Line items: ${liErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ invoice: inv, catalog_version: CATALOG_VERSION })
}
