/**
 * Format an integer-minutes value as a human-readable hours label.
 *
 * Used by the portal digest SMS body and the digest email summary line.
 * Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §9.
 *
 *   0       → "0m"
 *   <60     → "{n}m"          ("45m")
 *   =60     → "1h"
 *   whole   → "{h}h"          ("3h")
 *   mixed   → "{h}h {m}m"     ("3h 15m")
 */
export function formatHoursLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '0m'
  const total = Math.round(minutes)
  if (total === 0) return '0m'
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
