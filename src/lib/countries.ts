// ── Countries ──────────────────────────────────────────────────────
// ISO 3166-1 alpha-2 codes used in prospects.country.
//
// PRIORITY_COUNTRIES are surfaced at the top of dropdowns — the
// markets DSIG actively serves. The rest are listed alphabetically
// so admins can pick any country if a prospect lands from outside the
// usual set.
//
// Single source of truth so PDF renderers + form pickers + the prospect
// table all agree on the same code → name mapping.

export interface Country {
  code: string  // ISO 3166-1 alpha-2
  name: string
}

/**
 * Markets DSIG actively serves. Surfaced at the top of country pickers.
 * Order matters — most-frequent first.
 */
export const PRIORITY_COUNTRY_CODES = ['US', 'CA', 'MX', 'TH', 'AU', 'GB']

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'TH', name: 'Thailand' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  // Rest of the world (alphabetical). This list isn't exhaustive — it
  // covers the most likely future-international markets. Add as needed.
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ZA', name: 'South Africa' },
]

const CODE_TO_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]))

/** Resolve an ISO code to a display name. Returns the code itself if unknown. */
export function countryName(code: string | null | undefined): string {
  if (!code) return ''
  return CODE_TO_NAME.get(code) ?? code
}

/** True when the prospect is outside the US (or country is unset). */
export function isInternational(code: string | null | undefined): boolean {
  if (!code) return false
  return code !== 'US'
}

/**
 * Sort COUNTRIES with priority markets first, then the rest alphabetically.
 * Useful for `<option>` rendering.
 */
export function countriesForPicker(): Country[] {
  const priority = PRIORITY_COUNTRY_CODES
    .map((code) => COUNTRIES.find((c) => c.code === code))
    .filter((c): c is Country => Boolean(c))
  const rest = COUNTRIES
    .filter((c) => !PRIORITY_COUNTRY_CODES.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...priority, ...rest]
}
