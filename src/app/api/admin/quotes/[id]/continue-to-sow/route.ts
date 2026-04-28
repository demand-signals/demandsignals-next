// ── POST /api/admin/quotes/[id]/continue-to-sow ──────────────────────────────
// Admin-gated. Creates a new SOW row pre-populated from the quote session:
//   - One phase "Phase 1" with deliverables mapped from selected_items
//   - Prospect + session linked
//   - Title seeded from business_name
//   - Pricing seeded from estimate_low (low of range = starting point)
//   - SOW number allocated via allocateDocNumber
//
// On success returns { sow_id, sow_number } and the caller redirects to
// /admin/sow/[sow_id].

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateDocNumber } from '@/lib/doc-numbering'
import { getServicesCatalog } from '@/lib/services-catalog'
import type { SowPhase, SowPhaseDeliverable, SowPricing } from '@/lib/invoice-types'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id: sessionId } = await params

  // ── Load the quote session ────────────────────────────────────────────
  const { data: session, error: sessErr } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, business_name, prospect_id, estimate_low, selected_items')
    .eq('id', sessionId)
    .single()

  if (sessErr || !session) {
    return NextResponse.json({ error: 'Quote session not found' }, { status: 404 })
  }

  if (!session.prospect_id) {
    return NextResponse.json(
      { error: 'Quote session is not linked to a prospect. Prospect sync must complete first.' },
      { status: 422 },
    )
  }

  // ── Load the prospect (need prospect_id confirmed, client_code for numbering) ──
  const { data: prospect, error: prospErr } = await supabaseAdmin
    .from('prospects')
    .select('id, business_name, client_code, scope_summary')
    .eq('id', session.prospect_id)
    .single()

  if (prospErr || !prospect) {
    return NextResponse.json({ error: 'Linked prospect not found' }, { status: 404 })
  }

  // ── Map selected_items → phase deliverables ───────────────────────────
  const selectedItems = Array.isArray(session.selected_items)
    ? (session.selected_items as Array<{ id: string; quantity: number }>)
    : []

  let catalog: Awaited<ReturnType<typeof getServicesCatalog>> = []
  if (selectedItems.length > 0) {
    catalog = await getServicesCatalog({ activeOnly: false })
  }
  const catalogMap = new Map(catalog.map((r) => [r.id, r]))

  const deliverables: SowPhaseDeliverable[] = selectedItems.map((item) => {
    const cat = catalogMap.get(item.id)
    const pricingType = cat?.pricing_type ?? 'one-time'

    // Map catalog pricing_type to SowPhaseDeliverable cadence
    let cadence: SowPhaseDeliverable['cadence']
    if (pricingType === 'monthly') {
      cadence = 'monthly'
    } else {
      // one-time or both → default to one_time (admin can change in editor)
      cadence = 'one_time'
    }

    // Pick the unit price — prefer display_price_cents for one-time; monthly_range_low for monthly
    let unitPriceCents: number | undefined
    if (cat) {
      if (pricingType === 'monthly') {
        unitPriceCents = cat.monthly_range_low_cents ?? cat.display_price_cents ?? undefined
      } else {
        unitPriceCents = cat.display_price_cents ?? cat.base_range_low_cents ?? undefined
      }
    }

    const quantity = item.quantity ?? 1
    const lineTotalCents =
      unitPriceCents !== undefined ? quantity * unitPriceCents : undefined

    return {
      id: crypto.randomUUID(),
      service_id: item.id,
      name: cat?.name ?? item.id,
      description: cat?.description ?? cat?.benefit ?? '',
      cadence,
      quantity,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
      start_trigger: {
        type: 'on_phase_complete',
        phase_id: null,
        date: null,
      },
    }
  })

  const phases: SowPhase[] = [
    {
      id: crypto.randomUUID(),
      name: 'Phase 1',
      description: '',
      deliverables,
    },
  ]

  // ── Build pricing from session estimate_low ───────────────────────────
  // Use the sum of one_time deliverable line totals when available;
  // fall back to session.estimate_low; final fallback 0.
  const oneTimeTotalFromDeliverables = deliverables
    .filter((d) => d.cadence === 'one_time')
    .reduce((sum, d) => sum + (d.line_total_cents ?? 0), 0)

  const totalCents =
    oneTimeTotalFromDeliverables > 0
      ? oneTimeTotalFromDeliverables
      : (session.estimate_low ?? 0)

  const depositPct = 25
  const depositCents = Math.round(totalCents * depositPct / 100)

  const pricing: SowPricing = {
    total_cents: totalCents,
    deposit_cents: depositCents,
    deposit_pct: depositPct,
  }

  // ── Insert SOW with temp number ───────────────────────────────────────
  const businessName = session.business_name ?? prospect.business_name ?? 'Untitled'
  const title = `${businessName} — Project`
  const tempNumber = `PENDING-${crypto.randomUUID()}`

  const { data: sow, error: sowErr } = await supabaseAdmin
    .from('sow_documents')
    .insert({
      sow_number: tempNumber,
      prospect_id: session.prospect_id,
      quote_session_id: sessionId,
      status: 'draft',
      title,
      scope_summary: prospect.scope_summary ?? null,
      phases,
      deliverables: [],
      timeline: [],
      pricing,
      payment_terms: 'Net 30. 25% deposit on acceptance; remainder on delivery.',
      guarantees: null,
      notes: null,
      computed_from_deliverables: false,
      created_by: auth.user.id,
    })
    .select('id, sow_number')
    .single()

  if (sowErr || !sow) {
    return NextResponse.json({ error: sowErr?.message ?? 'SOW creation failed' }, { status: 500 })
  }

  // ── Allocate SOW number (with rollback on failure) ────────────────────
  try {
    let sowNumber: string

    if (prospect.client_code) {
      sowNumber = await allocateDocNumber({
        doc_type: 'SOW',
        prospect_id: session.prospect_id,
        ref_table: 'sow_documents',
        ref_id: sow.id,
      })
    } else {
      // No client_code — fall back to legacy sequential number
      const { data: legacyNum, error: numErr } = await supabaseAdmin.rpc('generate_sow_number')
      if (numErr || !legacyNum) {
        throw new Error(`Legacy number generation failed: ${numErr?.message}`)
      }
      sowNumber = legacyNum as string
    }

    await supabaseAdmin
      .from('sow_documents')
      .update({ sow_number: sowNumber })
      .eq('id', sow.id)

    return NextResponse.json({ sow_id: sow.id, sow_number: sowNumber })
  } catch (numErr) {
    // Rollback: remove the orphaned SOW row with the PENDING number
    await supabaseAdmin.from('sow_documents').delete().eq('id', sow.id)
    return NextResponse.json(
      { error: numErr instanceof Error ? numErr.message : 'SOW number allocation failed' },
      { status: 400 },
    )
  }
}
