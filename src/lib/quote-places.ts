// Google Places API (New) client — server-only.
// Uses field masks to control billing tier. See:
// https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
//
// Cost per call (post-$200/mo free tier):
//   Text Search (Basic fields)         $0.017
//   Place Details (Essentials fields)  $0.005
//   Place Details (Pro: reviews/hours) $0.020
//
// Per research run we fire: 1 text search + 1 Pro details = ~$0.037
// Free tier covers ~5,400 research runs per month.
//
// Required env: GOOGLE_PLACES_API_KEY

const PLACES_BASE = 'https://places.googleapis.com/v1'
const apiKey = () => process.env.GOOGLE_PLACES_API_KEY

export function isPlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY)
}

export interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  website: string | null
  business_status: string | null
  types: string[]
  location: { lat: number; lng: number } | null
}

export interface PlaceDetails {
  place_id: string
  name: string
  formatted_address: string
  website: string | null
  phone: string | null
  rating: number | null
  user_rating_count: number | null
  regular_opening_hours_text: string[]
  price_level: string | null
  primary_type: string | null
  types: string[]
  reviews: Array<{
    author: string
    rating: number
    text: string
    time: string
    relative_time: string
  }>
  photo_count: number
  google_maps_uri: string | null
}

/**
 * Text search — find a business by name + location.
 * Returns up to 5 candidate matches. Caller should pick the best one.
 * Billed as Text Search (Basic) = $0.017/call after free tier.
 */
export async function searchPlaces(query: string, maxResults = 5): Promise<PlaceSearchResult[]> {
  const key = apiKey()
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not set')

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      // Basic-tier field mask. Do NOT add reviews/hours here — that bumps to Pro.
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.websiteUri',
        'places.businessStatus',
        'places.types',
        'places.location',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: Math.max(1, Math.min(maxResults, 10)),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`searchPlaces ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as { places?: unknown[] }
  const places = Array.isArray(data.places) ? data.places : []
  return places.map((p: unknown) => {
    const pl = p as Record<string, unknown>
    const loc = pl.location as Record<string, number> | undefined
    const displayName = pl.displayName as { text?: string } | undefined
    return {
      place_id: String(pl.id ?? ''),
      name: displayName?.text ?? '',
      formatted_address: String(pl.formattedAddress ?? ''),
      website: (pl.websiteUri as string | null) ?? null,
      business_status: (pl.businessStatus as string | null) ?? null,
      types: Array.isArray(pl.types) ? (pl.types as string[]) : [],
      location: loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
        ? { lat: loc.latitude, lng: loc.longitude }
        : null,
    }
  })
}

/**
 * Place details — fetch reviews, hours, photo count, phone. Billed as Pro = $0.020.
 * Only call after we've confirmed a match from searchPlaces.
 */
export async function getPlaceDetails(place_id: string): Promise<PlaceDetails> {
  const key = apiKey()
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not set')

  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(place_id)}`, {
    headers: {
      'X-Goog-Api-Key': key,
      // Pro-tier fields. We want reviews + hours for the research narrative.
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'websiteUri',
        'nationalPhoneNumber',
        'rating',
        'userRatingCount',
        'regularOpeningHours.weekdayDescriptions',
        'priceLevel',
        'primaryType',
        'types',
        'reviews',
        'photos',
        'googleMapsUri',
      ].join(','),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`getPlaceDetails ${res.status}: ${body.slice(0, 300)}`)
  }

  const pl = (await res.json()) as Record<string, unknown>
  const displayName = pl.displayName as { text?: string } | undefined
  const hours = pl.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined
  const reviewsRaw = Array.isArray(pl.reviews) ? (pl.reviews as unknown[]) : []
  const photosRaw = Array.isArray(pl.photos) ? (pl.photos as unknown[]) : []

  return {
    place_id: String(pl.id ?? place_id),
    name: displayName?.text ?? '',
    formatted_address: String(pl.formattedAddress ?? ''),
    website: (pl.websiteUri as string | null) ?? null,
    phone: (pl.nationalPhoneNumber as string | null) ?? null,
    rating: typeof pl.rating === 'number' ? pl.rating : null,
    user_rating_count: typeof pl.userRatingCount === 'number' ? pl.userRatingCount : null,
    regular_opening_hours_text: hours?.weekdayDescriptions ?? [],
    price_level: (pl.priceLevel as string | null) ?? null,
    primary_type: (pl.primaryType as string | null) ?? null,
    types: Array.isArray(pl.types) ? (pl.types as string[]) : [],
    reviews: reviewsRaw.slice(0, 5).map((r) => {
      const rev = r as Record<string, unknown>
      const authorAttribution = rev.authorAttribution as { displayName?: string } | undefined
      const text = rev.text as { text?: string } | undefined
      return {
        author: authorAttribution?.displayName ?? '',
        rating: typeof rev.rating === 'number' ? rev.rating : 0,
        text: text?.text ?? '',
        time: String(rev.publishTime ?? ''),
        relative_time: String(rev.relativePublishTimeDescription ?? ''),
      }
    }),
    photo_count: photosRaw.length,
    google_maps_uri: (pl.googleMapsUri as string | null) ?? null,
  }
}

/**
 * Confidence heuristic for "is this place the one the prospect described?"
 * Returns 0.0-1.0. Used by the research agent to decide whether to
 * surface a confirmation question or skip silently.
 */
export function matchConfidence(
  query: { name: string; city: string },
  place: PlaceSearchResult,
): number {
  const q = query.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const p = place.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  let score = 0

  // Name match — partial substring both ways
  if (p.includes(q) || q.includes(p)) score += 0.6
  else {
    // Word overlap
    const qw = new Set(query.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2))
    const pw = new Set(place.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2))
    const overlap = [...qw].filter((w) => pw.has(w)).length
    if (overlap > 0) score += 0.3 * Math.min(1, overlap / qw.size)
  }

  // City in address
  const city = query.city.toLowerCase()
  if (city && place.formatted_address.toLowerCase().includes(city)) score += 0.3

  // Business is operational
  if (place.business_status === 'OPERATIONAL' || !place.business_status) score += 0.1

  return Math.min(1, score)
}
