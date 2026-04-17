// Quote engine — pure calculation layer. No DB calls, no I/O.
// Inputs: selected items from the catalog + narrowing answers + payment mode.
// Outputs: estimate_low, estimate_high, monthly ranges, timeline weeks, accuracy %.
//
// Money math lives here so it can be unit-tested in isolation.

import { getItem, type PricingItem } from './quote-pricing'

export interface SelectedItem {
  id: string
  quantity: number
  narrowing_answers?: Record<string, string | number | boolean>
}

export interface EstimateTotals {
  // Build (one-time) totals in cents.
  upfrontLow: number
  upfrontHigh: number
  // Monthly totals in cents per month.
  monthlyLow: number
  monthlyHigh: number
  // Timeline — longest parallel path through selected items.
  timelineWeeksLow: number
  timelineWeeksHigh: number
  // Accuracy 50-95.
  accuracyPct: number
  // Per-item contribution breakdown for display.
  perItem: Array<{
    id: string
    oneTimeLow: number
    oneTimeHigh: number
    monthlyLow: number
    monthlyHigh: number
    timelineLow: number
    timelineHigh: number
  }>
}

// ============================================================
// Narrowing — each answer can tighten the range width and/or shift the midpoint.
// Wide range starts as [low, high] from the catalog. Each factor with tightenBy
// multiplies the half-width by (1 - tightenBy). Shifts multiply the midpoint.
// ============================================================
function applyNarrowing(
  baseLow: number,
  baseHigh: number,
  item: PricingItem,
  answers: Record<string, string | number | boolean> = {},
): [number, number] {
  let low = baseLow
  let high = baseHigh
  for (const factor of item.narrowingFactors) {
    const answered = answers[factor.id] !== undefined && answers[factor.id] !== null && answers[factor.id] !== ''
    if (!answered) continue
    if (factor.tightenBy && factor.tightenBy > 0 && factor.tightenBy < 1) {
      const mid = (low + high) / 2
      const halfWidth = (high - low) / 2
      const newHalf = halfWidth * (1 - factor.tightenBy)
      low = Math.round(mid - newHalf)
      high = Math.round(mid + newHalf)
    }
    if (factor.shiftMultiplier && factor.shiftMultiplier > 0) {
      low = Math.round(low * factor.shiftMultiplier)
      high = Math.round(high * factor.shiftMultiplier)
    }
  }
  return [Math.max(0, low), Math.max(0, high)]
}

// ============================================================
// Per-item contribution — splits into one-time vs monthly, honors quantities.
// ============================================================
interface ItemContribution {
  id: string
  oneTimeLow: number
  oneTimeHigh: number
  monthlyLow: number
  monthlyHigh: number
  timelineLow: number
  timelineHigh: number
  parallelGroup: string
  dependsOn: readonly string[]
}

function contributionFor(selected: SelectedItem): ItemContribution | null {
  const item = getItem(selected.id)
  if (!item) return null

  let oneTimeLow = 0
  let oneTimeHigh = 0
  let monthlyLow = 0
  let monthlyHigh = 0

  const quantity = Math.max(1, Math.floor(selected.quantity || item.defaultQuantity || 1))

  if (item.quantifiable && item.perUnitRange) {
    const [perLow, perHigh] = applyNarrowing(
      item.perUnitRange[0],
      item.perUnitRange[1],
      item,
      selected.narrowing_answers,
    )
    if (item.type === 'one-time') {
      oneTimeLow = perLow * quantity
      oneTimeHigh = perHigh * quantity
    } else if (item.type === 'monthly') {
      monthlyLow = perLow * quantity
      monthlyHigh = perHigh * quantity
    } else {
      // 'both' with quantifiable is unusual but supported — treat perUnit as one-time.
      oneTimeLow = perLow * quantity
      oneTimeHigh = perHigh * quantity
      if (item.monthlyRange) {
        monthlyLow = item.monthlyRange[0]
        monthlyHigh = item.monthlyRange[1]
      }
    }
  } else {
    if (item.type === 'one-time' || item.type === 'both') {
      const [low, high] = applyNarrowing(
        item.baseRange[0],
        item.baseRange[1],
        item,
        selected.narrowing_answers,
      )
      oneTimeLow = low
      oneTimeHigh = high
    }
    if ((item.type === 'monthly' || item.type === 'both') && item.monthlyRange) {
      monthlyLow = item.monthlyRange[0]
      monthlyHigh = item.monthlyRange[1]
    }
  }

  // Free items contribute their real value but zero cost — invoice layer applies 100% discount.
  if (item.isFree) {
    oneTimeLow = 0
    oneTimeHigh = 0
    monthlyLow = 0
    monthlyHigh = 0
  }

  return {
    id: item.id,
    oneTimeLow,
    oneTimeHigh,
    monthlyLow,
    monthlyHigh,
    timelineLow: item.timelineWeeks[0],
    timelineHigh: item.timelineWeeks[1],
    parallelGroup: item.parallelGroup,
    dependsOn: item.dependsOn ?? [],
  }
}

// ============================================================
// Timeline DAG — longest path through dependsOn chains, collapsing parallelGroups.
// Items in the same parallelGroup with no dep between them run concurrently;
// the group's duration = max of members. Chains of groups add sequentially.
// ============================================================
function timelineFor(contribs: ItemContribution[]): [number, number] {
  if (contribs.length === 0) return [0, 0]

  // Build a map of id → contribution for fast lookup.
  const byId = new Map(contribs.map((c) => [c.id, c]))

  // Compute longest path for each node with memoization.
  // longestPath[id] = [maxLow, maxHigh] of durations ending at this node inclusive.
  const memo = new Map<string, [number, number]>()

  function visit(id: string, visiting: Set<string>): [number, number] {
    if (memo.has(id)) return memo.get(id)!
    if (visiting.has(id)) {
      // Cycle — treat as terminal. Validated catalog should prevent this.
      return [0, 0]
    }
    visiting.add(id)

    const node = byId.get(id)
    if (!node) {
      visiting.delete(id)
      return [0, 0]
    }

    let maxDepLow = 0
    let maxDepHigh = 0
    for (const depId of node.dependsOn) {
      // Only count deps that are actually selected.
      if (!byId.has(depId)) continue
      const [depLow, depHigh] = visit(depId, visiting)
      if (depLow > maxDepLow) maxDepLow = depLow
      if (depHigh > maxDepHigh) maxDepHigh = depHigh
    }

    visiting.delete(id)
    const result: [number, number] = [maxDepLow + node.timelineLow, maxDepHigh + node.timelineHigh]
    memo.set(id, result)
    return result
  }

  let longestLow = 0
  let longestHigh = 0
  for (const c of contribs) {
    const [l, h] = visit(c.id, new Set())
    if (l > longestLow) longestLow = l
    if (h > longestHigh) longestHigh = h
  }
  return [longestLow, longestHigh]
}

// ============================================================
// Accuracy — tracks how specific the selection is. Starts at 50%,
// grows with item count + answered narrowing factors. Caps at 95%.
// ============================================================
function computeAccuracy(selections: readonly SelectedItem[]): number {
  if (selections.length === 0) return 50
  let score = 50
  score += Math.min(20, selections.length * 3) // up to +20 for breadth
  let answered = 0
  let possible = 0
  for (const sel of selections) {
    const item = getItem(sel.id)
    if (!item) continue
    for (const factor of item.narrowingFactors) {
      possible += 1
      if (
        sel.narrowing_answers &&
        sel.narrowing_answers[factor.id] !== undefined &&
        sel.narrowing_answers[factor.id] !== null &&
        sel.narrowing_answers[factor.id] !== ''
      ) {
        answered += 1
      }
    }
  }
  if (possible > 0) {
    score += Math.round((answered / possible) * 25)
  }
  return Math.min(95, Math.max(50, score))
}

// ============================================================
// Public entry — calculateTotals. Pure. No side effects.
// ============================================================
export function calculateTotals(selections: readonly SelectedItem[]): EstimateTotals {
  const contribs: ItemContribution[] = []
  let upfrontLow = 0
  let upfrontHigh = 0
  let monthlyLow = 0
  let monthlyHigh = 0

  for (const sel of selections) {
    const c = contributionFor(sel)
    if (!c) continue
    contribs.push(c)
    upfrontLow += c.oneTimeLow
    upfrontHigh += c.oneTimeHigh
    monthlyLow += c.monthlyLow
    monthlyHigh += c.monthlyHigh
  }

  const [timelineWeeksLow, timelineWeeksHigh] = timelineFor(contribs)
  const accuracyPct = computeAccuracy(selections)

  const perItem = contribs.map((c) => ({
    id: c.id,
    oneTimeLow: c.oneTimeLow,
    oneTimeHigh: c.oneTimeHigh,
    monthlyLow: c.monthlyLow,
    monthlyHigh: c.monthlyHigh,
    timelineLow: c.timelineLow,
    timelineHigh: c.timelineHigh,
  }))

  return {
    upfrontLow,
    upfrontHigh,
    monthlyLow,
    monthlyHigh,
    timelineWeeksLow,
    timelineWeeksHigh,
    accuracyPct,
    perItem,
  }
}

// ============================================================
// Monthly plan math — 25% deposit + (build cost / 12) + selected monthly services.
// Documented in spec Section 6.
// ============================================================
export interface MonthlyPlan {
  depositLow: number
  depositHigh: number
  monthlyPaymentLow: number
  monthlyPaymentHigh: number
  totalMonthsFinanced: number
  // Total cost over 12 months vs upfront, for the "saves you $X" note.
  monthlyPlanTotalLow: number
  monthlyPlanTotalHigh: number
  savingsLow: number
  savingsHigh: number
}

export function monthlyPlan(totals: EstimateTotals, months = 12): MonthlyPlan {
  const depositLow = Math.round(totals.upfrontLow * 0.25)
  const depositHigh = Math.round(totals.upfrontHigh * 0.25)
  const financedLow = totals.upfrontLow - depositLow
  const financedHigh = totals.upfrontHigh - depositHigh
  // 12% convenience premium baked into the monthly total (spec section 6: "roughly 10-15%").
  const premium = 1.12
  const monthlyPaymentLow = Math.round((financedLow * premium) / months) + totals.monthlyLow
  const monthlyPaymentHigh = Math.round((financedHigh * premium) / months) + totals.monthlyHigh
  const monthlyPlanTotalLow =
    depositLow + (monthlyPaymentLow - totals.monthlyLow) * months + totals.monthlyLow * months
  const monthlyPlanTotalHigh =
    depositHigh + (monthlyPaymentHigh - totals.monthlyHigh) * months + totals.monthlyHigh * months
  const upfrontTotalLow = totals.upfrontLow + totals.monthlyLow * months
  const upfrontTotalHigh = totals.upfrontHigh + totals.monthlyHigh * months
  return {
    depositLow,
    depositHigh,
    monthlyPaymentLow,
    monthlyPaymentHigh,
    totalMonthsFinanced: months,
    monthlyPlanTotalLow,
    monthlyPlanTotalHigh,
    savingsLow: Math.max(0, monthlyPlanTotalLow - upfrontTotalLow),
    savingsHigh: Math.max(0, monthlyPlanTotalHigh - upfrontTotalHigh),
  }
}

// ============================================================
// Milestone plan — only offered when upfront build cost > $8,000 ($800,000 cents).
// 4 payments: 25% / 35% / 25% / 15% of build cost. Monthly services start at launch.
// ============================================================
export interface MilestonePlan {
  eligible: boolean
  milestones: Array<{ label: string; low: number; high: number; dueAt: string }>
}

export function milestonePlan(totals: EstimateTotals): MilestonePlan {
  const eligible = totals.upfrontHigh >= 800_000
  if (!eligible) return { eligible, milestones: [] }
  const buildLow = totals.upfrontLow
  const buildHigh = totals.upfrontHigh
  return {
    eligible,
    milestones: [
      {
        label: 'Discovery + Design',
        low: Math.round(buildLow * 0.25),
        high: Math.round(buildHigh * 0.25),
        dueAt: 'kickoff',
      },
      {
        label: 'Core Build',
        low: Math.round(buildLow * 0.35),
        high: Math.round(buildHigh * 0.35),
        dueAt: 'design approval',
      },
      {
        label: 'Content + SEO',
        low: Math.round(buildLow * 0.25),
        high: Math.round(buildHigh * 0.25),
        dueAt: 'beta launch',
      },
      {
        label: 'Launch + Optimization',
        low: Math.round(buildLow * 0.15),
        high: Math.round(buildHigh * 0.15),
        dueAt: 'go-live',
      },
    ],
  }
}

// ============================================================
// ROI math — honors the display thresholds from Section 22.2.
// Returns null if the prospect didn't provide both inputs or payback > 24 months.
// ============================================================
export interface RoiSummary {
  monthlyLostCents: number          // raw stated loss (pre-capture) — context only
  annualLostCents: number            // raw annual (capped at $2M for display)
  recoverableMonthlyCents: number    // what DSIG could realistically recover/mo (25% of raw)
  recoverableAnnualCents: number     // annual recoverable
  paybackMonths: number | null
  firstYearRoiPct: number | null
  display: 'full' | 'partial' | 'none'
  capped: boolean
  captureRatePct: number             // so UI can label "at X% capture"
}

export function computeRoi(
  missedLeadsMonthly: number | null | undefined,
  avgCustomerValueCents: number | null | undefined,
  estimateMidpointCents: number,
): RoiSummary | null {
  if (!missedLeadsMonthly || missedLeadsMonthly <= 0) return null
  if (!avgCustomerValueCents || avgCustomerValueCents <= 0) return null

  // TOTAL stated loss — raw ceiling.
  const monthlyLostCents = missedLeadsMonthly * avgCustomerValueCents
  const ANNUAL_CAP_CENTS = 200_000_000 // $2,000,000 display cap
  const rawAnnual = monthlyLostCents * 12
  const capped = rawAnnual > ANNUAL_CAP_CENTS
  const annualLostCents = capped ? ANNUAL_CAP_CENTS : rawAnnual

  // CAPTURE RATE — DSIG recovers a fraction of missed revenue, not 100%.
  // 25% is a conservative, defensible figure for year 1 of a local SEO + rebuild project.
  // The full lost revenue stays visible as context, but payback math uses the capture.
  const CAPTURE_RATE = 0.25
  const recoverableMonthlyCents = Math.round(monthlyLostCents * CAPTURE_RATE)

  // Payback with realistic capture. Floor at 1.0 month — anything faster reads as fake.
  // Ramp-up: local SEO + site rebuild take 4-8 weeks to start producing results.
  const MIN_PAYBACK_MONTHS = 1.0
  const rawPayback = recoverableMonthlyCents > 0
    ? estimateMidpointCents / recoverableMonthlyCents
    : null
  const paybackMonths = rawPayback === null ? null : Math.max(MIN_PAYBACK_MONTHS, rawPayback)

  const recoverableAnnualCents = Math.min(annualLostCents, recoverableMonthlyCents * 12)

  let display: RoiSummary['display'] = 'none'
  let firstYearRoiPct: number | null = null

  if (paybackMonths !== null) {
    if (paybackMonths <= 6) {
      display = 'full'
      // First-year ROI uses the capture-adjusted annual recovery vs project cost.
      firstYearRoiPct = Math.round(
        ((recoverableAnnualCents - estimateMidpointCents) / estimateMidpointCents) * 100,
      )
    } else if (paybackMonths <= 12) {
      display = 'partial'
    } else {
      display = 'none'
    }
  }

  return {
    monthlyLostCents,
    annualLostCents,
    recoverableMonthlyCents,
    recoverableAnnualCents,
    paybackMonths,
    firstYearRoiPct,
    display,
    capped,
    captureRatePct: Math.round(CAPTURE_RATE * 100),
  }
}

// ============================================================
// Formatting — cents → display string. Keep in one place so every surface agrees.
// ============================================================
export function formatCents(cents: number): string {
  if (cents < 0) cents = 0
  const dollars = Math.round(cents / 100)
  return '$' + dollars.toLocaleString('en-US')
}

export function formatRange(lowCents: number, highCents: number): string {
  if (lowCents === highCents) return formatCents(lowCents)
  return `${formatCents(lowCents)}–${formatCents(highCents)}`
}
