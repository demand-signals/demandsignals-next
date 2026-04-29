// Helpers for rendering budgetary prices as ranges instead of single numbers.
// Hunter's directive: prospects should never see a single fake-precision price.
// Every dollar value renders low-high so the budgetary nature is visible.
//
// Two consumers:
//   1. AI system prompt — instructs Claude to always quote ranges in chat copy
//   2. UI midpoint rendering — when accuracy is low, we used to show a single
//      "starting around $X" midpoint. That's now a range too.

const DEFAULT_SPREAD = 0.3

export function spreadCents(midpointCents: number, spread: number = DEFAULT_SPREAD): {
  low: number
  high: number
} {
  if (!midpointCents || midpointCents <= 0) return { low: 0, high: 0 }
  const low = Math.round(midpointCents * (1 - spread))
  const high = Math.round(midpointCents * (1 + spread))
  return { low, high }
}

export function formatCents(cents: number): string {
  if (!cents || cents <= 0) return '$0'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

export function formatRangeFromMidpoint(midpointCents: number, spread: number = DEFAULT_SPREAD): string {
  const { low, high } = spreadCents(midpointCents, spread)
  if (low === high) return formatCents(low)
  return `${formatCents(low)}–${formatCents(high)}`
}
