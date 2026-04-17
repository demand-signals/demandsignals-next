// Research subagent — runs in a background serverless invocation after the
// conversational agent captures business_name + business_location.
//
// Pipeline:
//   1. Google Places Text Search → candidate matches
//   2. Pick best match via matchConfidence, call Place Details for full profile
//   3. If we have a URL (either from prospect or from GBP), fetch homepage
//      and extract signal-level issues (speed, schema, H1, contact form, etc)
//   4. Write the combined findings to quote_sessions.research_findings
//   5. Next chat turn will read findings and inject them into Claude context,
//      which will weave them into the reply using the confirmation-hook pattern.

import { isPlacesConfigured, searchPlaces, getPlaceDetails, matchConfidence, type PlaceSearchResult, type PlaceDetails } from './quote-places'
import { supabaseAdmin } from './supabase/admin'

export interface SiteScan {
  url: string
  fetched_at: string
  status: number | null
  ttfb_ms: number | null
  content_length: number | null
  has_h1: boolean
  has_schema: boolean
  schema_types: string[]
  title: string | null
  meta_description: string | null
  has_contact_form: boolean
  has_booking_link: boolean
  platform_hint: string | null
  notable_issues: string[]
  error: string | null
}

export interface ResearchFindings {
  version: 1
  completed_at: string
  place: PlaceDetails | null
  place_candidates: PlaceSearchResult[]
  match_confidence: number
  site_scan: SiteScan | null
  confirmation_hook: string | null
  observations: string[]
  suggested_adds: string[]
  raw_errors: string[]
}

// ============================================================
// Simple site scan — no headless browser. Just fetch + regex parse.
// ============================================================
async function scanSite(url: string): Promise<SiteScan> {
  const started = Date.now()
  const scan: SiteScan = {
    url,
    fetched_at: new Date().toISOString(),
    status: null,
    ttfb_ms: null,
    content_length: null,
    has_h1: false,
    has_schema: false,
    schema_types: [],
    title: null,
    meta_description: null,
    has_contact_form: false,
    has_booking_link: false,
    platform_hint: null,
    notable_issues: [],
    error: null,
  }

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 12_000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DSIG-Research/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(t)
    scan.ttfb_ms = Date.now() - started
    scan.status = res.status
    if (!res.ok) {
      scan.error = `http_${res.status}`
      scan.notable_issues.push(`Site returns ${res.status} — may be down or blocking crawlers`)
      return scan
    }

    const html = await res.text()
    scan.content_length = html.length

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    scan.title = titleMatch ? titleMatch[1].trim().slice(0, 200) : null

    // Meta description
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    scan.meta_description = metaDesc ? metaDesc[1].slice(0, 300) : null

    // H1 presence
    scan.has_h1 = /<h1[\s>]/i.test(html)

    // Schema (JSON-LD blocks)
    const schemaBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    if (schemaBlocks.length > 0) {
      scan.has_schema = true
      for (const m of schemaBlocks) {
        try {
          const parsed = JSON.parse(m[1])
          const items = Array.isArray(parsed) ? parsed : [parsed]
          for (const it of items) {
            if (it && typeof it === 'object' && typeof it['@type'] === 'string') {
              scan.schema_types.push(it['@type'])
            }
          }
        } catch {
          // Malformed schema, don't crash
        }
      }
    }

    // Contact form heuristic
    scan.has_contact_form = /<form[^>]*>[\s\S]*?(contact|email|message|name=["']name|name=["']email)/i.test(html)

    // Booking link heuristic
    scan.has_booking_link = /(calendly|acuity|bookings?\/|schedule|book now|book online|book an appointment)/i.test(html)

    // Platform hint — very rough
    if (html.includes('wp-content/') || html.includes('/wp-includes/')) scan.platform_hint = 'WordPress'
    else if (html.includes('wix.com') || html.includes('wixstatic')) scan.platform_hint = 'Wix'
    else if (html.includes('squarespace.com') || html.includes('static1.squarespace')) scan.platform_hint = 'Squarespace'
    else if (html.includes('shopify.com') || html.includes('cdn.shopify')) scan.platform_hint = 'Shopify'
    else if (html.includes('__next_f') || html.includes('/_next/')) scan.platform_hint = 'Next.js'

    // Notable issues — used by the AI to build the observation line
    if ((scan.ttfb_ms ?? 0) > 3000) scan.notable_issues.push(`slow initial load (${(scan.ttfb_ms! / 1000).toFixed(1)}s)`)
    if (!scan.has_schema) scan.notable_issues.push('no structured data / schema')
    if (!scan.has_h1) scan.notable_issues.push('missing H1 heading')
    if (!scan.meta_description) scan.notable_issues.push('no meta description')
    if (!scan.has_contact_form) scan.notable_issues.push('no visible contact form')
    if (!scan.has_booking_link) scan.notable_issues.push('no booking flow detected')
    if (scan.platform_hint === 'Wix') scan.notable_issues.push('Wix platform — limits AI integrations, hurts speed')
    if (scan.platform_hint === 'WordPress') scan.notable_issues.push('WordPress — slower, needs constant plugin updates')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'scan failed'
    scan.error = msg
    scan.notable_issues.push('could not reach site for scan')
  }

  return scan
}

// ============================================================
// Build the narrative pieces the AI will weave in.
// ============================================================
function buildConfirmationHook(place: PlaceDetails | null, siteUrl: string | null): string | null {
  if (!place) return null
  const parts: string[] = []
  parts.push(`Are you the ${place.name}`)
  if (siteUrl) parts.push(`at ${stripProtocol(siteUrl)}`)
  if (place.formatted_address) {
    // Include street if we can find it
    const addr = place.formatted_address.split(',')[0].trim()
    if (addr && !siteUrl) parts.push(`over on ${addr}`)
  }
  if (place.rating && place.user_rating_count && place.user_rating_count > 3) {
    parts.push(`— ${place.user_rating_count} reviews at ${place.rating.toFixed(1)} stars on Google`)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim() + '?'
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function buildObservations(place: PlaceDetails | null, scan: SiteScan | null): string[] {
  const obs: string[] = []
  if (place) {
    if (place.rating && place.user_rating_count) {
      if (place.rating >= 4.5 && place.user_rating_count >= 20) {
        obs.push(`strong review footprint (${place.user_rating_count} reviews at ${place.rating.toFixed(1)} stars)`)
      } else if (place.user_rating_count < 5) {
        obs.push('thin review footprint — more reviews would help local ranking')
      } else if (place.rating < 4.0) {
        obs.push(`average rating ${place.rating.toFixed(1)} — reputation work would move the needle`)
      }
    }
    if (place.photo_count < 5) obs.push('few photos on GBP — adding photos is a ranking lever')
    if (!place.website) obs.push('no website linked on GBP — major missed signal')
    if (place.regular_opening_hours_text.length === 0) obs.push('hours not listed on GBP')
  }
  if (scan && scan.error === null) {
    for (const issue of scan.notable_issues) obs.push(issue)
  }
  return obs
}

function buildSuggestedAdds(place: PlaceDetails | null, scan: SiteScan | null): string[] {
  const adds: string[] = []
  // These are catalog item IDs — AI will call add_item with them.
  if (place && place.rating && place.user_rating_count) {
    if (place.photo_count < 10 || place.user_rating_count < 20) adds.push('gbp-setup')
  }
  if (scan) {
    if (scan.notable_issues.some((i) => i.includes('slow'))) adds.push('performance-optimization')
    if (!scan.has_schema || scan.notable_issues.some((i) => i.includes('schema'))) adds.push('seo-retrofit')
    if (scan.platform_hint === 'Wix' || scan.platform_hint === 'Squarespace') adds.push('content-migration')
  }
  return Array.from(new Set(adds))
}

// ============================================================
// Entry — called by /api/quote/research/kick
// ============================================================
export async function runResearch(sessionId: string): Promise<ResearchFindings> {
  const errors: string[] = []
  const now = () => new Date().toISOString()

  await supabaseAdmin
    .from('quote_sessions')
    .update({ research_started_at: now() })
    .eq('id', sessionId)

  const { data: session } = await supabaseAdmin
    .from('quote_sessions')
    .select('business_name, business_location, existing_site_url')
    .eq('id', sessionId)
    .single()

  if (!session || !session.business_name) {
    const findings: ResearchFindings = {
      version: 1,
      completed_at: now(),
      place: null,
      place_candidates: [],
      match_confidence: 0,
      site_scan: null,
      confirmation_hook: null,
      observations: [],
      suggested_adds: [],
      raw_errors: ['session missing business_name'],
    }
    await persistFindings(sessionId, findings)
    return findings
  }

  let placeCandidates: PlaceSearchResult[] = []
  let bestMatch: PlaceSearchResult | null = null
  let details: PlaceDetails | null = null
  let matchConf = 0

  if (isPlacesConfigured()) {
    try {
      const query = `${session.business_name}${session.business_location ? ' ' + session.business_location : ''}`
      placeCandidates = await searchPlaces(query, 5)
      if (placeCandidates.length > 0) {
        // Rank by match confidence.
        const scored = placeCandidates.map((p) => ({
          place: p,
          score: matchConfidence(
            { name: session.business_name ?? '', city: session.business_location ?? '' },
            p,
          ),
        }))
        scored.sort((a, b) => b.score - a.score)
        bestMatch = scored[0].place
        matchConf = scored[0].score
        if (matchConf >= 0.5) {
          try {
            details = await getPlaceDetails(bestMatch.place_id)
          } catch (e) {
            errors.push(`place_details: ${e instanceof Error ? e.message : 'unknown'}`)
          }
        }
      }
    } catch (e) {
      errors.push(`places_search: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  } else {
    errors.push('places_not_configured')
  }

  // Site URL — prefer what the prospect told us, fall back to what GBP has.
  const urlToScan = session.existing_site_url ?? details?.website ?? null
  let siteScan: SiteScan | null = null
  if (urlToScan && /^https?:\/\//i.test(urlToScan)) {
    try {
      siteScan = await scanSite(urlToScan)
    } catch (e) {
      errors.push(`site_scan: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  const findings: ResearchFindings = {
    version: 1,
    completed_at: now(),
    place: details,
    place_candidates: placeCandidates,
    match_confidence: matchConf,
    site_scan: siteScan,
    confirmation_hook: buildConfirmationHook(details, urlToScan),
    observations: buildObservations(details, siteScan),
    suggested_adds: buildSuggestedAdds(details, siteScan),
    raw_errors: errors,
  }

  await persistFindings(sessionId, findings)
  return findings
}

async function persistFindings(sessionId: string, findings: ResearchFindings): Promise<void> {
  await supabaseAdmin
    .from('quote_sessions')
    .update({
      research_findings: findings,
      research_completed_at: findings.completed_at,
    })
    .eq('id', sessionId)
  await supabaseAdmin.from('quote_events').insert({
    session_id: sessionId,
    event_type: 'research_completed',
    event_data: {
      match_confidence: findings.match_confidence,
      has_place: findings.place !== null,
      has_site_scan: findings.site_scan !== null && findings.site_scan.error === null,
      observations_count: findings.observations.length,
      suggested_adds: findings.suggested_adds,
      errors: findings.raw_errors,
    },
  })
}
