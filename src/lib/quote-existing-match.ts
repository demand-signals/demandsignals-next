// Read-only lookup: given research findings (Google Places + site scan),
// find any existing prospect that this business already corresponds to.
// Used by runResearch() to populate quote_sessions.matched_prospect_id so
// the AI can ask a last-4 confirmation question and the prospect-sync
// path can skip its fuzzy fallback chain.
//
// SAFETY:
//   - Pure read. Never writes. Never throws (errors return null).
//   - Caller is expected to swallow null silently — this is a hint, not
//     authoritative dedup. The downstream syncProspectFromSession still
//     runs its own fallback chain when this returns null.
//   - Returns the last 4 of the prospect's phone on file so the AI can
//     ask "is this still the best number for you, ending in NNNN?".
//     Never returns the full phone, never returns email, name beyond
//     the prospect_id, client_code, or any other CRM data.

import { supabaseAdmin } from './supabase/admin'
import { toE164 } from './quote-crypto'
import type { ResearchFindings } from './quote-research'

export interface ExistingMatch {
  prospect_id: string
  /** Last 4 digits of the prospect's owner_phone (preferred) or business_phone.
   *  Null when the matched prospect has no phone on file — the AI then skips
   *  the last-4 question and the link still happens silently on sync. */
  owner_phone_last_four: string | null
}

/**
 * Strip protocol + leading www. + trailing slash from a URL. Returns null
 * for unparseable input. Used to compare website hosts loosely.
 */
function normalizeHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.host.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}

/**
 * Lowercase + strip non-alphanumeric for loose business-name comparison.
 * "South Side MMA" → "southsidemma"; "Acme Co." → "acmeco".
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Pull last 4 digits from a phone string. Returns null if fewer than 4
 * digits present.
 */
function lastFourDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : null
}

/**
 * Pick the most useful last-4 from a prospect: prefer owner_phone, fall
 * back to business_phone, then null.
 */
function pickLastFour(p: { owner_phone: string | null; business_phone: string | null }): string | null {
  return lastFourDigits(p.owner_phone) ?? lastFourDigits(p.business_phone)
}

/**
 * Find any prospect already in the CRM matching this research finding.
 *
 * Lookup order (broadest match wins, since this is a hint not authoritative):
 *   1. Phone match — Place phone E.164-normalized, compared against E.164
 *      normalization of prospects.owner_phone OR business_phone.
 *   2. Website host match — Place website host vs prospects.website_url host.
 *   3. Name + city match — punctuation-stripped lowercase business_name +
 *      ilike city.
 *
 * First non-null hit wins. Returns null on no match or any error.
 */
export async function findExistingProspectFromResearch(
  findings: ResearchFindings,
): Promise<ExistingMatch | null> {
  try {
    const place = findings.place
    if (!place) return null // no Place match = nothing to look up

    // ── 1. Phone match ─────────────────────────────────────────────
    if (place.phone) {
      const targetE164 = toE164(place.phone)
      if (targetE164) {
        // Pull a candidate set scoped by city if we have one — keeps the
        // result small enough to normalize in JS without scanning the
        // whole table.
        const cityHint = (() => {
          const addr = place.formatted_address ?? ''
          const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
          // "1234 Main St, City, ST 12345, USA" → parts[1] = "City"
          return parts.length >= 2 ? parts[1] : null
        })()

        let q = supabaseAdmin
          .from('prospects')
          .select('id, owner_phone, business_phone')
          .or('owner_phone.not.is.null,business_phone.not.is.null')
          .limit(200)

        if (cityHint) q = q.ilike('city', cityHint)

        const { data: candidates } = await q
        if (candidates && candidates.length > 0) {
          for (const c of candidates) {
            const ownerE164 = toE164(c.owner_phone ?? '')
            const bizE164 = toE164(c.business_phone ?? '')
            if (ownerE164 === targetE164 || bizE164 === targetE164) {
              return {
                prospect_id: c.id,
                owner_phone_last_four: pickLastFour(c),
              }
            }
          }
        }
      }
    }

    // ── 2. Website host match ──────────────────────────────────────
    const placeHost = normalizeHost(place.website)
    if (placeHost) {
      const { data: candidates } = await supabaseAdmin
        .from('prospects')
        .select('id, owner_phone, business_phone, website_url')
        .not('website_url', 'is', null)
        .limit(500)
      if (candidates) {
        for (const c of candidates) {
          if (normalizeHost(c.website_url) === placeHost) {
            return {
              prospect_id: c.id,
              owner_phone_last_four: pickLastFour(c),
            }
          }
        }
      }
    }

    // ── 3. Name + city match ───────────────────────────────────────
    if (place.name) {
      const targetName = normalizeName(place.name)
      if (targetName) {
        // Parse "1234 X St, City, ST 12345, USA" → "City"
        const parts = (place.formatted_address ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const cityHint = parts.length >= 2 ? parts[1] : null

        let q = supabaseAdmin
          .from('prospects')
          .select('id, business_name, owner_phone, business_phone, city')
          .limit(200)
        if (cityHint) q = q.ilike('city', cityHint)

        const { data: candidates } = await q
        if (candidates) {
          for (const c of candidates) {
            if (normalizeName(c.business_name) === targetName) {
              return {
                prospect_id: c.id,
                owner_phone_last_four: pickLastFour(c),
              }
            }
          }
        }
      }
    }

    return null
  } catch (err) {
    console.error('[findExistingProspectFromResearch] error:', err instanceof Error ? err.message : err)
    return null
  }
}
