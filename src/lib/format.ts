// Pure money formatters — no imports, safe for both server and client bundles.
// Keep this file import-free so client components can import it without
// pulling in server-only modules (supabase, fs, etc).

export function formatCents(cents: number): string {
  if (cents < 0) cents = 0
  const dollars = Math.round(cents / 100)
  return '$' + dollars.toLocaleString('en-US')
}

export function formatRange(lowCents: number, highCents: number): string {
  if (lowCents === highCents) return formatCents(lowCents)
  return `${formatCents(lowCents)}–${formatCents(highCents)}`
}
