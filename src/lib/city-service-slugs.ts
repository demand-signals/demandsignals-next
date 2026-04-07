/**
 * Pre-built lookup table for root-level LTP slugs.
 * Cannot split "{city}-{service}" on hyphens (both sides contain hyphens),
 * so we build an explicit map: slug → { citySlug, serviceSlug }.
 *
 * Also contains alias entries: e.g. "el-dorado-hills-web-developer" → wordpress-development
 */

import { CITY_SLUGS } from './cities'
import { SERVICE_SLUGS } from './services'

export type CityServiceSlug = {
  citySlug: string
  serviceSlug: string
}

/** Alias service slugs that map to a canonical service */
const SERVICE_ALIASES: Record<string, string> = {
  'web-developer': 'wordpress-development',
  'websites': 'wordpress-development',
}

/** Build the full lookup map: "{city}-{service}" → { citySlug, serviceSlug } */
function buildLookup(): Map<string, CityServiceSlug> {
  const map = new Map<string, CityServiceSlug>()

  for (const citySlug of CITY_SLUGS) {
    // Core service slugs
    for (const serviceSlug of SERVICE_SLUGS) {
      const key = `${citySlug}-${serviceSlug}`
      map.set(key, { citySlug, serviceSlug })
    }

    // Alias slugs
    for (const [alias, canonicalService] of Object.entries(SERVICE_ALIASES)) {
      const key = `${citySlug}-${alias}`
      map.set(key, { citySlug, serviceSlug: canonicalService })
    }
  }

  return map
}

const LOOKUP = buildLookup()

/** All valid root-level LTP slugs (core + aliases) */
export const ALL_CITY_SERVICE_SLUGS = Array.from(LOOKUP.keys())

/** Get city + service from a combined slug, or undefined if invalid */
export function getCityServiceBySlug(slug: string): CityServiceSlug | undefined {
  return LOOKUP.get(slug)
}

/** Get all slugs for static generation (for generateStaticParams) */
export function getAllCityServiceParams(): Array<{ cityService: string }> {
  return ALL_CITY_SERVICE_SLUGS.map(slug => ({ cityService: slug }))
}
