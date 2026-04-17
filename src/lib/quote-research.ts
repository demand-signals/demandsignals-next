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
  /** HTTPS reachable + cert valid. null if not attempted (http-only URL). */
  https_valid: boolean | null
  /** SSL-specific error message if cert invalid or connection refused. */
  ssl_error: string | null

  // ── AGENTIC DISCOVERY (v1.13) ──
  /** URLs found in sitemap.xml / sitemap_index.xml. null if sitemap not found. */
  sitemap_url_count: number | null
  /** Top-level navigation link labels (first 10). */
  nav_items: string[]
  /** Headlines from h1/h2/h3 tags (first 20). Used to infer services. */
  headlines: string[]
  /** Social links detected anywhere in the HTML. */
  social_links: {
    facebook?: string
    instagram?: string
    linkedin?: string
    tiktok?: string
    youtube?: string
    twitter?: string
    yelp?: string
  }
  /** Phone numbers found on the page (up to 5, deduped). */
  phones: string[]
  /** City/location name mentions (up to 10, deduped). Useful for multi-location detection. */
  city_mentions: string[]
  /** Inferred service/product terms from headlines + nav (up to 10). */
  likely_services: string[]

  // ── LLM DISCOVERABILITY (v1.13) ──
  /** True if /llms.txt returns 200 — the emerging AI-crawler discovery standard. */
  has_llms_txt: boolean
  /** First line / H1 from llms.txt if present (title of the AI manifest). */
  llms_txt_title: string | null
  /** Number of H2 sections in llms.txt (each section = grouped set of pages). */
  llms_txt_section_count: number | null

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
    https_valid: null,
    ssl_error: null,
    sitemap_url_count: null,
    nav_items: [],
    headlines: [],
    social_links: {},
    phones: [],
    city_mentions: [],
    likely_services: [],
    has_llms_txt: false,
    llms_txt_title: null,
    llms_txt_section_count: null,
    notable_issues: [],
    error: null,
  }

  // First try HTTPS specifically to detect SSL death. If a prospect's URL is
  // http://..., we upgrade to https:// for this probe so we can observe
  // whether the cert works. A dead cert is a flashing red flag for SEO
  // and trust — every browser shows a scary warning to visitors.
  const normalizedUrl = url.replace(/^http:\/\//i, 'https://')
  const probeHttpsOnly = normalizedUrl !== url || url.startsWith('https://')

  if (probeHttpsOnly) {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 8_000)
      const probeRes = await fetch(normalizedUrl, {
        signal: controller.signal,
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DSIG-Research/1.0)' },
        redirect: 'follow',
      })
      clearTimeout(t)
      scan.https_valid = probeRes.ok || (probeRes.status >= 300 && probeRes.status < 400)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ssl probe failed'
      // Node's fetch surfaces cert errors as specific codes
      if (/CERT_|SELF_SIGNED|UNABLE_TO_|certificate|TLS|handshake/i.test(msg)) {
        scan.https_valid = false
        scan.ssl_error = msg.slice(0, 200)
        scan.notable_issues.push('SSL certificate is broken — browsers show a security warning to visitors')
      } else {
        // Connection refused etc. — site may still be up on HTTP
        scan.ssl_error = msg.slice(0, 200)
      }
    }
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

    // ── Nav items (first 10 top-level <a> labels) ──
    try {
      const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i)
      const navHtml = navMatch ? navMatch[1] : html.slice(0, 8000) // fall back to head of page
      const linkMatches = [...navHtml.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
      const items: string[] = []
      for (const m of linkMatches) {
        const label = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (label.length >= 2 && label.length <= 40 && !items.includes(label)) {
          items.push(label)
        }
        if (items.length >= 10) break
      }
      scan.nav_items = items
    } catch {
      /* navigation parse best-effort */
    }

    // ── Headlines (h1/h2/h3, first 20 deduped) ──
    try {
      const hMatches = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
      const seen = new Set<string>()
      for (const m of hMatches) {
        const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text.length >= 2 && text.length <= 120 && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase())
          scan.headlines.push(text)
        }
        if (scan.headlines.length >= 20) break
      }
    } catch {
      /* headlines parse best-effort */
    }

    // ── Social links ──
    const socialPatterns: Array<[keyof SiteScan['social_links'], RegExp]> = [
      ['facebook', /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/i],
      ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-/]+/i],
      ['linkedin', /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_.\-/]+/i],
      ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/i],
      ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|@|c\/|user\/)[A-Za-z0-9_\-]+/i],
      ['twitter', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i],
      ['yelp', /https?:\/\/(?:www\.)?yelp\.com\/biz\/[A-Za-z0-9_\-]+/i],
    ]
    for (const [key, pattern] of socialPatterns) {
      const match = html.match(pattern)
      if (match) {
        scan.social_links[key] = match[0]
      }
    }

    // ── Phone numbers on page (up to 5, deduped) ──
    try {
      const phoneMatches = html.match(/\b(?:\+?1[-.\s]?)?\(?([2-9][0-9]{2})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g) ?? []
      const seen = new Set<string>()
      for (const p of phoneMatches) {
        const digits = p.replace(/\D/g, '').replace(/^1/, '')
        if (digits.length === 10 && !seen.has(digits)) {
          seen.add(digits)
          scan.phones.push(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`)
        }
        if (scan.phones.length >= 5) break
      }
    } catch {
      /* phones parse best-effort */
    }

    // ── City mentions — extract from visible text (rough pass, US-oriented) ──
    // Looks for Capitalized-Word, Capitalized-Word sequences that look like
    // "City, ST" or "City, State". Not perfect, but a useful hint.
    try {
      const cityMatches = html.match(/\b([A-Z][a-z]+(?:[ -][A-Z][a-z]+){0,2}),\s*(?:[A-Z]{2}|California|Oregon|Texas|New York|Nevada|Washington|Florida)\b/g) ?? []
      const seen = new Set<string>()
      for (const c of cityMatches) {
        const city = c.split(',')[0].trim()
        if (city.length >= 3 && !seen.has(city)) {
          seen.add(city)
          scan.city_mentions.push(city)
        }
        if (scan.city_mentions.length >= 10) break
      }
    } catch {
      /* cities parse best-effort */
    }

    // ── Likely services — pull short noun-phrases from headlines + nav that
    // look service-y. Drops common non-service words (About, Home, Contact, etc.)
    const STOPWORDS = new Set([
      'home', 'about', 'about us', 'contact', 'contact us', 'blog', 'news',
      'careers', 'jobs', 'team', 'our team', 'our story', 'services', 'solutions',
      'privacy', 'terms', 'sitemap', 'login', 'sign in', 'sign up', 'cart',
      'shop', 'store', 'faq', 'faqs', 'help', 'support', 'menu', 'book', 'book now',
      'call', 'email', 'locations', 'find us', 'appointment',
    ])
    const candidates = [...scan.nav_items, ...scan.headlines]
    const serviceSeen = new Set<string>()
    for (const raw of candidates) {
      const clean = raw.trim().toLowerCase()
      if (clean.length < 3 || clean.length > 50) continue
      if (STOPWORDS.has(clean)) continue
      if (serviceSeen.has(clean)) continue
      serviceSeen.add(clean)
      scan.likely_services.push(raw.trim())
      if (scan.likely_services.length >= 10) break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'scan failed'
    scan.error = msg
    scan.notable_issues.push('could not reach site for scan')
    return scan
  }

  // ── Sitemap URL count (fetch /sitemap.xml, fall back to /sitemap_index.xml) ──
  try {
    const origin = new URL(url).origin
    for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
      try {
        const c = new AbortController()
        const t = setTimeout(() => c.abort(), 5_000)
        const r = await fetch(origin + path, {
          signal: c.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DSIG-Research/1.0)' },
        })
        clearTimeout(t)
        if (!r.ok) continue
        const body = await r.text()
        // Count <url> entries (sitemap) or <sitemap> entries (index)
        const urlCount = (body.match(/<url>/g) ?? []).length
        const indexCount = (body.match(/<sitemap>/g) ?? []).length
        scan.sitemap_url_count = urlCount > 0 ? urlCount : indexCount
        break
      } catch {
        /* try next */
      }
    }
  } catch {
    /* no sitemap — that's a signal itself */
  }

  // ── llms.txt detection (AI crawler discovery standard) ──
  try {
    const origin = new URL(url).origin
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 5_000)
    const r = await fetch(origin + '/llms.txt', {
      signal: c.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DSIG-Research/1.0)' },
    })
    clearTimeout(t)
    if (r.ok) {
      const body = await r.text()
      // Must look like a real llms.txt (markdown with H1), not a 200-with-HTML fallback
      if (body.length > 20 && /^#\s+/m.test(body)) {
        scan.has_llms_txt = true
        const titleMatch = body.match(/^#\s+(.+?)$/m)
        scan.llms_txt_title = titleMatch ? titleMatch[1].trim().slice(0, 120) : null
        scan.llms_txt_section_count = (body.match(/^##\s+/gm) ?? []).length
      }
    }
  } catch {
    /* llms.txt missing — expected for most sites today */
  }

  // ── Notable issues — used by the AI to build the observation line ──
  if ((scan.ttfb_ms ?? 0) > 3000) scan.notable_issues.push(`slow initial load (${(scan.ttfb_ms! / 1000).toFixed(1)}s)`)
  if (!scan.has_schema) scan.notable_issues.push('no structured data / schema')
  if (!scan.has_h1) scan.notable_issues.push('missing H1 heading')
  if (!scan.meta_description) scan.notable_issues.push('no meta description')
  if (!scan.has_contact_form) scan.notable_issues.push('no visible contact form')
  if (!scan.has_booking_link) scan.notable_issues.push('no booking flow detected')
  if (scan.platform_hint === 'Wix') scan.notable_issues.push('Wix platform — limits AI integrations, hurts speed')
  if (scan.platform_hint === 'WordPress') scan.notable_issues.push('WordPress — slower, needs constant plugin updates')
  if (scan.sitemap_url_count === null) scan.notable_issues.push('no sitemap found — search engines have to guess at page structure')
  else if (scan.sitemap_url_count < 10) scan.notable_issues.push(`only ${scan.sitemap_url_count} pages in sitemap — thin for search coverage`)
  if (!scan.has_llms_txt) scan.notable_issues.push('no llms.txt — AI crawlers (Claude, ChatGPT, Perplexity) have no curated manifest to read')
  if (Object.keys(scan.social_links).length === 0) scan.notable_issues.push('no social links detected on the page')

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
    // Agentic observations — confirmation-first, not interrogation.
    if (scan.sitemap_url_count !== null) {
      obs.push(`sitemap has ${scan.sitemap_url_count} pages indexed`)
    }
    if (scan.nav_items.length > 0) {
      obs.push(`nav menu: ${scan.nav_items.slice(0, 6).join(', ')}`)
    }
    if (scan.city_mentions.length > 0) {
      obs.push(`cities mentioned on site: ${scan.city_mentions.slice(0, 6).join(', ')}`)
    }
    if (scan.likely_services.length > 0) {
      obs.push(`likely services from page copy: ${scan.likely_services.slice(0, 6).join(', ')}`)
    }
    if (scan.phones.length > 0) {
      obs.push(`phone(s) on site: ${scan.phones.join(', ')}`)
    }
    const socials = Object.keys(scan.social_links)
    if (socials.length > 0) {
      obs.push(`social links: ${socials.join(', ')}`)
    }
    if (scan.has_llms_txt) {
      obs.push(`✓ has llms.txt (${scan.llms_txt_section_count ?? 0} sections) — they're ahead of the curve on AI discoverability`)
    }
    // Existing scan-derived issues
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
    .select('business_name, business_type, business_location, existing_site_url')
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
      // Build a richer query using business_type when available.
      // "McHale Seattle" → ambiguous (law firm wins).
      // "McHale backpack Seattle" → disambiguates directly.
      // Also try the URL's domain as an anchor if we have it.
      const queries: string[] = []
      const coreParts = [session.business_name, session.business_type, session.business_location].filter(Boolean)
      queries.push(coreParts.join(' '))
      // Fallback: just name + location (for generic business types like "llc")
      if (session.business_type && session.business_type.length > 0) {
        queries.push(`${session.business_name} ${session.business_location ?? ''}`.trim())
      }
      // Domain-anchored query — pulls match by site
      if (session.existing_site_url) {
        const domain = session.existing_site_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
        if (domain) queries.push(`${session.business_name} ${domain}`)
      }

      // Try each query until we find a high-confidence match.
      let bestOverall: { place: PlaceSearchResult; score: number } | null = null
      for (const q of queries) {
        try {
          const results = await searchPlaces(q, 5)
          if (results.length === 0) continue
          placeCandidates = results // keep last non-empty set for observation
          const scored = results.map((p) => ({
            place: p,
            score: matchConfidence(
              { name: session.business_name ?? '', city: session.business_location ?? '' },
              p,
            ),
          }))
          scored.sort((a, b) => b.score - a.score)
          if (!bestOverall || scored[0].score > bestOverall.score) {
            bestOverall = scored[0]
          }
          // If we got a strong match, stop querying.
          if (bestOverall.score >= 0.7) break
        } catch (e) {
          errors.push(`places_search_retry: ${e instanceof Error ? e.message : 'unknown'}`)
        }
      }

      if (bestOverall && bestOverall.score >= 0.5) {
        bestMatch = bestOverall.place
        matchConf = bestOverall.score
        try {
          details = await getPlaceDetails(bestMatch.place_id)
        } catch (e) {
          errors.push(`place_details: ${e instanceof Error ? e.message : 'unknown'}`)
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
