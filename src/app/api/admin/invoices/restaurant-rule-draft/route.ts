// ── POST /api/admin/invoices/restaurant-rule-draft ──────────────────
// Automation endpoint: creates a $0 Restaurant Rule draft from a qualifying
// quote_session. Respects automated_invoicing_enabled config flag.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getItemById, getDisplayPriceCents } from '@/lib/quote-pricing'

// Catalog IDs that constitute the Restaurant Rule free-research bundle.
const RESTAURANT_RULE_ITEMS = ['market-research', 'competitor-analysis', 'site-social-audit']

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  const sessionId: string | undefined = body?.quote_session_id
  if (!sessionId) {
    return NextResponse.json({ error: 'quote_session_id required' }, { status: 400 })
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

  // Duplicate guard.
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('id')
    .eq('quote_session_id', sessionId)
    .eq('auto_trigger', 'restaurant_rule')
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      {
        error: 'Restaurant Rule invoice already exists for this session',
        existing_invoice_id: existing.id,
      },
      { status: 409 },
    )
  }

  // Build line items: 3 research items at displayPriceCents + 100% discount line.
  let researchLines
  try {
    researchLines = RESTAURANT_RULE_ITEMS.map((itemId, idx) => {
      const item = getItemById(itemId)
      if (!item) throw new Error(`Catalog item missing: ${itemId}`)
      const price = getDisplayPriceCents(item)
      return {
        sort_order: idx,
        description: item.name,
        quantity: 1,
        unit_price_cents: price,
        subtotal_cents: price,
        discount_pct: 0,
        discount_cents: 0,
        discount_label: null as string | null,
        line_total_cents: price,
      }
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Catalog error' },
      { status: 500 },
    )
  }

  const subtotalCents = researchLines.reduce((s, r) => s + r.subtotal_cents, 0)
  const discountLine = {
    sort_order: researchLines.length,
    description: 'Introductory Research Credit (100% off)',
    quantity: 1,
    unit_price_cents: -subtotalCents,
    subtotal_cents: -subtotalCents,
    discount_pct: 0,
    discount_cents: 0,
    discount_label: 'Complimentary research package',
    line_total_cents: -subtotalCents,
  }
  const allLines = [...researchLines, discountLine]

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
      subtotal_cents: subtotalCents,
      discount_cents: subtotalCents,
      total_due_cents: 0,
      currency: 'USD',
      auto_generated: true,
      auto_trigger: 'restaurant_rule',
      auto_sent: false,
      category_hint: 'marketing_expense',
      notes:
        'This research is complimentary. Your investment comes later, only if you choose to move forward with implementation.',
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
    admin_url: `/admin/invoices/${inv.id}`,
  })
}
