// ── GET /api/admin/invoices — list ──────────────────────────────────
// ── POST /api/admin/invoices — create draft ─────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CATALOG_VERSION } from '@/lib/quote-pricing'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { buildInvoicePaymentTerms } from '@/lib/payment-terms'
import type { InvoiceKind, CategoryHint } from '@/lib/invoice-types'

interface CreateLineItem {
  catalog_item_id?: string
  description?: string
  quantity: number
  unit_price_cents?: number
  discount_pct?: number
  discount_label?: string
  use_display_price?: boolean
  // Cadence (migration 043). Defaults to 'one_time' for back-compat.
  cadence?: 'one_time' | 'monthly' | 'annual'
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
      `id, invoice_number, kind, prospect_id, status, total_due_cents, currency,
       auto_generated, auto_trigger, created_at, sent_at, viewed_at, paid_at,
       stripe_payment_link_url, subscription_intent, term_months, until_cancelled,
       trade_credit_cents,
       prospects(business_name),
       invoice_line_items(line_total_cents, cadence, quantity, unit_price_cents)`,
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

  // Per-row split (matches /admin/sow endpoint shape):
  //   $ Project = one-time line totals
  //   $ Subscriptions = monthly+annual at full per-cycle price ($40/mo + $25/yr = $65)
  //   $ TIK = trade_credit_cents
  //   $ Total = project + subscriptions + TIK (gross deal value, additive)
  //
  // Legacy invoices (pre-043) have no cadence column on existing line
  // items — those rows default to 'one_time' on the DB side via the
  // migration DEFAULT, so they bucket into project_cents naturally.
  // line_total_cents fallback math mirrors the SOW endpoint helper.
  type LineRow = {
    line_total_cents: number | null
    cadence: string | null
    quantity: number | null
    unit_price_cents: number | null
  }
  function lineValueCents(li: LineRow): number {
    if (typeof li.line_total_cents === 'number' && li.line_total_cents > 0) {
      return li.line_total_cents
    }
    const unit = li.unit_price_cents ?? 0
    const qty = li.quantity ?? 1
    return Math.round(unit * qty)
  }
  // Pull the next pending scheduled-send per invoice in one shot. Soonest
  // send_at wins. We're only listing a page of invoices at a time so this
  // stays cheap. Filtered to status='scheduled' (still queued, not yet
  // fired/cancelled/failed).
  const invoiceIds = (data ?? []).map((r) => (r as { id: string }).id)
  const nextScheduled: Record<string, { send_at: string; channel: string; kind: string }> = {}
  if (invoiceIds.length > 0) {
    const { data: schedRows } = await supabaseAdmin
      .from('invoice_scheduled_sends')
      .select('invoice_id, send_at, channel, kind')
      .in('invoice_id', invoiceIds)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
    for (const s of schedRows ?? []) {
      // Order ASC + first-write-wins gives us the soonest send per invoice.
      if (!nextScheduled[s.invoice_id]) {
        nextScheduled[s.invoice_id] = {
          send_at: s.send_at,
          channel: s.channel,
          kind: s.kind,
        }
      }
    }
  }

  const enriched = (data ?? []).map((row) => {
    const lines = (row as unknown as { invoice_line_items?: LineRow[] }).invoice_line_items ?? []
    const tikCents = (row as unknown as { trade_credit_cents?: number }).trade_credit_cents ?? 0
    let oneTimeCents = 0
    let recurringCents = 0
    for (const li of lines) {
      const v = lineValueCents(li)
      if (li.cadence === 'monthly' || li.cadence === 'annual') recurringCents += v
      else oneTimeCents += v
    }
    const totalCents = oneTimeCents + recurringCents + tikCents
    const invoiceId = (row as { id: string }).id
    const nextS = nextScheduled[invoiceId] ?? null
    return {
      ...row,
      project_cents: oneTimeCents,
      subscriptions_cents: recurringCents,
      tik_cents: tikCents,
      computed_total_cents: totalCents,
      next_scheduled_send_at: nextS?.send_at ?? null,
      next_scheduled_send_channel: nextS?.channel ?? null,
      next_scheduled_send_kind: nextS?.kind ?? null,
    }
  })

  return NextResponse.json({ invoices: enriched, total: count ?? 0, limit, offset })
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
    payment_terms,
    term_months,
    until_cancelled,
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
    // Free-text payment terms (migration 040). Empty/missing → server auto-generates.
    payment_terms?: string | null
    // Term governs subscription duration (migration 043). Mutually exclusive.
    term_months?: number | null
    until_cancelled?: boolean
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
        cadence: li.cadence ?? 'one_time',
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
      // subscription_intent flips to 'pending' when any line is recurring.
      // Webhook flips → 'created' on first Payment Link checkout.
      subscription_intent: resolved.some((r) => r.cadence !== 'one_time') ? 'pending' : 'none',
      // Term: default to 12 months for recurring invoices, NULL for pure
      // one-time. Admin can edit to 24 / N / until_cancelled afterwards.
      term_months: until_cancelled
        ? null
        : (term_months ?? (resolved.some((r) => r.cadence !== 'one_time') ? 12 : null)),
      until_cancelled: until_cancelled ?? false,
      // Auto-generate payment terms from invoice shape if admin left it blank.
      // Empty trim = "auto"; any non-blank value = "admin-authored, leave alone".
      payment_terms:
        payment_terms && payment_terms.trim()
          ? payment_terms
          : (buildInvoicePaymentTerms({
              totalCents: totalDueCents,
              dueDate: due_date ?? null,
              tradeCents: tikCents,
              discountCents: docDiscountCents,
              lateFeeCents: late_fee_cents ?? 0,
              lateFeeGraceDays: late_fee_grace_days ?? 0,
            }) || null),
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
