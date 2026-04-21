import { NextRequest, NextResponse } from 'next/server'
import { authorizeSession } from '@/lib/quote-session'
import { calculateTotals, monthlyPlan, milestonePlan, computeRoi, type SelectedItem } from '@/lib/quote-engine'
import { getServiceSync, hydrateCatalogSnapshot } from '@/lib/services-catalog-sync'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// POST /api/quote/prices — returns prices for the CURRENT session's selected items.
// Pre-phone-verification: returns { locked: true, items: [{id, name, benefit, locked: true}] }
// Post-phone-verification: returns full pricing + totals + monthly plan + milestone + ROI.
export async function POST(request: NextRequest) {
  const auth = await authorizeSession(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }
  const { session } = auth

  const selections = (Array.isArray(session.selected_items) ? session.selected_items : []) as SelectedItem[]

  // Warm the DB-backed catalog snapshot so quote-engine sync lookups hit DB values
  // (falls back to legacy TS CATALOG if DB fetch fails). Fire-and-forget-safe.
  await hydrateCatalogSnapshot()

  // Hydrate catalog metadata for each selection — safe to return pre-verification (names only).
  const items = selections
    .map((sel) => {
      const item = getServiceSync(sel.id)
      if (!item) return null
      const base = {
        id: item.id,
        name: item.name,
        benefit: item.benefit,
        aiBadge: item.aiBadge,
        quantity: sel.quantity,
        quantityLabel: item.quantityLabel ?? null,
        category: item.category,
        isFree: item.isFree ?? false,
      }
      if (!session.phone_verified) {
        return { ...base, locked: true }
      }
      return { ...base, locked: false }
    })
    .filter(Boolean)

  if (!session.phone_verified) {
    return NextResponse.json({
      locked: true,
      items,
      accuracy_pct: session.accuracy_pct,
    })
  }

  // Phone verified — compute full pricing.
  const totals = calculateTotals(selections)
  const plan = monthlyPlan(totals)
  const milestone = milestonePlan(totals)
  const midpoint = Math.round((totals.upfrontLow + totals.upfrontHigh) / 2)
  const roi = computeRoi(session.missed_leads_monthly, session.avg_customer_value, midpoint)

  // Merge totals into each item for display.
  const itemsWithPrices = items.map((base) => {
    const match = totals.perItem.find((p) => p.id === base!.id)
    if (!match) return base
    return {
      ...base!,
      oneTimeLow: match.oneTimeLow,
      oneTimeHigh: match.oneTimeHigh,
      monthlyLow: match.monthlyLow,
      monthlyHigh: match.monthlyHigh,
      timelineLow: match.timelineLow,
      timelineHigh: match.timelineHigh,
    }
  })

  // Persist the derived totals onto the session (best-effort; don't fail the request if this errors).
  await supabaseAdmin
    .from('quote_sessions')
    .update({
      estimate_low: totals.upfrontLow,
      estimate_high: totals.upfrontHigh,
      monthly_low: totals.monthlyLow,
      monthly_high: totals.monthlyHigh,
      timeline_weeks_low: totals.timelineWeeksLow,
      timeline_weeks_high: totals.timelineWeeksHigh,
      accuracy_pct: totals.accuracyPct,
    })
    .eq('id', session.id)

  return NextResponse.json({
    locked: false,
    items: itemsWithPrices,
    totals: {
      upfront_low: totals.upfrontLow,
      upfront_high: totals.upfrontHigh,
      monthly_low: totals.monthlyLow,
      monthly_high: totals.monthlyHigh,
      timeline_weeks_low: totals.timelineWeeksLow,
      timeline_weeks_high: totals.timelineWeeksHigh,
      accuracy_pct: totals.accuracyPct,
    },
    monthly_plan: plan,
    milestone_plan: milestone,
    roi,
  })
}
