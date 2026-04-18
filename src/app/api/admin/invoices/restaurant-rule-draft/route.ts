// ── POST /api/admin/invoices/restaurant-rule-draft ──────────────────
// Courtesy / "Restaurant Rule" automation endpoint.
//
// Creates a $0 draft invoice with ONE chosen diagnostic/research item
// shown at its full display price, 100%-discounted as "New Client
// Appreciation". Prospect sees the real $ value being offered, not a
// "FREE" label — Scenario-1 psychology: nothing is free, everything is
// a courtesy discount.
//
// Default courtesy item = site-social-audit (the diagnostic: "here's
// what's wrong with your digital footprint" — pain-diagnostic closes
// harder than generic intelligence).
//
// Body: { quote_session_id: string, courtesy_item_id?: string }
// courtesy_item_id defaults to 'site-social-audit' if not provided.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getServiceById } from '@/lib/services-catalog'

// Allow-list of catalog IDs eligible for the courtesy flow. Prevents
// admin from accidentally gifting a $1,750 Project Plan via this endpoint
// (that one is reserved for the paid-project value stack on SOW accept).
const COURTESY_ELIGIBLE_IDS = new Set([
  'site-social-audit',   // default — diagnostic
  'market-research',      // market intelligence
  'competitor-analysis',  // competitive intelligence
])

const DEFAULT_COURTESY_ID = 'site-social-audit'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  const sessionId: string | undefined = body?.quote_session_id
  const courtesyItemId: string = body?.courtesy_item_id ?? DEFAULT_COURTESY_ID

  if (!sessionId) {
    return NextResponse.json({ error: 'quote_session_id required' }, { status: 400 })
  }
  if (!COURTESY_ELIGIBLE_IDS.has(courtesyItemId)) {
    return NextResponse.json(
      {
        error: `Invalid courtesy_item_id: ${courtesyItemId}. Must be one of: ${Array.from(COURTESY_ELIGIBLE_IDS).join(', ')}`,
      },
      { status: 400 },
    )
  }

  // Kill switch.
  const { data: cfg } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'automated_invoicing_enabled')
    .maybeSingle()
  if (cfg?.value !== 'true') {
    return NextResponse.json({ error: 'Automated invoicing is disabled' }, { status: 503 })
  }

  const { data: session } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, business_name, prospect_id, email, phone_verified')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (!session.prospect_id) {
    return NextResponse.json({ error: 'Session has no linked prospect' }, { status: 400 })
  }

  // Duplicate guard — prevent multiple courtesy invoices per session.
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('quote_session_id', sessionId)
    .eq('auto_trigger', 'restaurant_rule')
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      {
        error: 'Courtesy invoice already exists for this session',
        existing_invoice_id: existing.id,
      },
      { status: 409 },
    )
  }

  // Fetch the chosen courtesy item from the DB catalog.
  const courtesyItem = await getServiceById(courtesyItemId)
  if (!courtesyItem) {
    return NextResponse.json(
      { error: `Catalog item ${courtesyItemId} not found` },
      { status: 500 },
    )
  }

  const priceCents = courtesyItem.display_price_cents
  if (priceCents <= 0) {
    return NextResponse.json(
      { error: `Courtesy item ${courtesyItemId} has no display price set` },
      { status: 500 },
    )
  }

  // Line items: the courtesy item at full price + 100% appreciation discount = $0.
  const allLines = [
    {
      sort_order: 0,
      description:
        courtesyItem.name +
        (courtesyItem.description ? ` — ${courtesyItem.description}` : ''),
      quantity: 1,
      unit_price_cents: priceCents,
      subtotal_cents: priceCents,
      discount_pct: 0,
      discount_cents: 0,
      discount_label: null as string | null,
      line_total_cents: priceCents,
    },
    {
      sort_order: 1,
      description: 'New Client Appreciation — complimentary courtesy analysis',
      quantity: 1,
      unit_price_cents: -priceCents,
      subtotal_cents: -priceCents,
      discount_pct: 0,
      discount_cents: 0,
      discount_label: 'Complimentary',
      line_total_cents: -priceCents,
    },
  ]

  const { data: numResult, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number')
  if (numErr || !numResult) {
    return NextResponse.json(
      { error: `Number generation: ${numErr?.message}` },
      { status: 500 },
    )
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert({
      invoice_number: numResult,
      kind: 'restaurant_rule',
      prospect_id: session.prospect_id,
      quote_session_id: sessionId,
      status: 'draft',
      subtotal_cents: priceCents,
      discount_cents: priceCents,
      total_due_cents: 0,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: 'restaurant_rule',
      auto_sent: false,
      category_hint: 'marketing_expense',
      notes: `Complimentary ${courtesyItem.name} courtesy analysis. This is our way of showing we're serious about your success — a $${(priceCents / 100).toFixed(0)} value, no obligation.`,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  const inserts = allLines.map((l) => ({ invoice_id: inv.id, ...l }))
  const { error: liErr } = await supabaseAdmin.from('invoice_line_items').insert(inserts)
  if (liErr) {
    await supabaseAdmin.from('invoices').delete().eq('id', inv.id)
    return NextResponse.json({ error: `Line items: ${liErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    invoice: inv,
    business_name: session.business_name,
    courtesy_item: courtesyItem.name,
    admin_url: `/admin/invoices/${inv.id}`,
  })
}
