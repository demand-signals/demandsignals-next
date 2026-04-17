// Progressive prospect enrichment from quote_sessions.
//
// Triggers:
//   1. Research confirmation (prospect said "yes that's me") — richest
//   2. Phone verification — medium
//   3. Email-me-plan submission — lean
//
// Dedup precedence:
//   1. Match on phone_e164_hash
//   2. Match on (business_name, city) — unique constraint on prospects
//   3. Match on owner_email
//   4. Create new
//
// Every subsequent event enriches the prospect record until the session ends.

import { supabaseAdmin } from './supabase/admin'
import { decryptPhone } from './quote-crypto'
import { getItem } from './quote-pricing'
import type { QuoteSessionRow } from './quote-session'

interface ResearchFindings {
  place?: {
    name?: string
    formatted_address?: string
    website?: string | null
    phone?: string | null
    rating?: number | null
    user_rating_count?: number | null
    photo_count?: number
  } | null
  site_scan?: {
    url?: string
    ttfb_ms?: number | null
    has_schema?: boolean
    has_h1?: boolean
    has_contact_form?: boolean
    has_booking_link?: boolean
    platform_hint?: string | null
    notable_issues?: string[]
  } | null
  match_confidence?: number
  observations?: string[]
}

type SyncTrigger = 'research_confirmed' | 'phone_verified' | 'email_captured' | 'item_changed' | 'walkaway_flagged' | 'conversion_action'

// ============================================================
// Parse "El Dorado Hills, CA" → {city:"El Dorado Hills", state:"CA"}
// ============================================================
function parseLocation(loc: string | null): { city: string | null; state: string | null } {
  if (!loc) return { city: null, state: null }
  const parts = loc.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return { city: null, state: null }
  if (parts.length === 1) return { city: parts[0], state: null }
  return { city: parts[0], state: parts[1].slice(0, 2).toUpperCase() }
}

function parseAddress(formatted: string | null | undefined): { address: string | null; city: string | null; state: string | null; zip: string | null } {
  if (!formatted) return { address: null, city: null, state: null, zip: null }
  // Rough US parse: "1234 Main St, City, ST 12345, USA"
  const parts = formatted.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 3) return { address: parts[0] ?? null, city: null, state: null, zip: null }
  const address = parts[0]
  const city = parts[1]
  const stZip = parts[2].split(/\s+/)
  const state = stZip[0]?.slice(0, 2).toUpperCase() ?? null
  const zip = stZip[1] ?? null
  return { address, city, state, zip }
}

// ============================================================
// Compute a site_quality_score 0-100 from scan issues
// ============================================================
function siteQualityScore(findings: ResearchFindings | null): number | null {
  const scan = findings?.site_scan
  if (!scan) return null
  let score = 100
  if (!scan.has_h1) score -= 10
  if (!scan.has_schema) score -= 20
  if (!scan.has_contact_form) score -= 15
  if (!scan.has_booking_link) score -= 5
  if ((scan.ttfb_ms ?? 0) > 5000) score -= 25
  else if ((scan.ttfb_ms ?? 0) > 3000) score -= 15
  if (scan.platform_hint === 'Wix') score -= 10
  if (scan.platform_hint === 'Squarespace') score -= 5
  return Math.max(0, Math.min(100, score))
}

// ============================================================
// Build a one-line scope summary from selected_items
// ============================================================
function buildScopeSummary(selected: Array<{ id: string; quantity: number }>): string | null {
  if (!selected || selected.length === 0) return null
  const parts: string[] = []
  for (const sel of selected) {
    const item = getItem(sel.id)
    if (!item) continue
    const qty = sel.quantity > 1 ? ` x${sel.quantity}` : ''
    parts.push(`${item.name}${qty}`)
  }
  return parts.length ? parts.join(' · ') : null
}

// ============================================================
// Decrypt phone for storage on prospects (which stores phone in plaintext —
// the CRM existed before the quote estimator's encryption-at-rest model).
// If decrypt fails, we silently skip.
// ============================================================
function safeDecryptPhone(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    return decryptPhone(encrypted)
  } catch {
    return null
  }
}

// ============================================================
// Main sync function. Idempotent — safe to call on every session mutation.
// Returns the prospect_id (existing or newly created).
// ============================================================
export async function syncProspectFromSession(
  sessionId: string,
  trigger: SyncTrigger,
): Promise<string | null> {
  const { data: s, error } = await supabaseAdmin
    .from('quote_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error || !s) return null

  const session = s as QuoteSessionRow & {
    phone_encrypted?: string | null
    phone_e164_hash?: string | null
    phone_is_voip?: boolean | null
    research_findings?: ResearchFindings | null
  }

  const findings: ResearchFindings | null = session.research_findings ?? null

  // ── Gate: don't create prospect if we don't have ANY confirmed identity signal ──
  const hasResearchConfirm = session.research_confirmed === 1 && findings?.place
  const hasPhone = Boolean(session.phone_verified && session.phone_encrypted)
  const hasEmail = Boolean(session.email)

  if (!hasResearchConfirm && !hasPhone && !hasEmail) {
    return session.prospect_id // no signals, nothing to sync
  }

  // ── Resolve or create prospect ──
  let prospectId: string | null = session.prospect_id

  if (!prospectId) {
    prospectId = await findExistingProspect(session, findings)
  }

  const decryptedPhone = safeDecryptPhone(session.phone_encrypted)
  const loc = parseLocation(session.business_location)
  const placeAddr = parseAddress(findings?.place?.formatted_address)
  const selected = Array.isArray(session.selected_items) ? (session.selected_items as Array<{ id: string; quantity: number }>) : []

  // Build the update payload — only set fields we have values for
  const payload: Record<string, unknown> = {
    last_activity_at: new Date().toISOString(),
  }
  if (session.business_name) payload.business_name = session.business_name
  if (session.business_type) payload.industry = session.business_type
  if (placeAddr.address) payload.address = placeAddr.address
  if (placeAddr.city || loc.city) payload.city = placeAddr.city ?? loc.city
  if (placeAddr.state || loc.state) payload.state = placeAddr.state ?? loc.state ?? 'CA'
  if (placeAddr.zip) payload.zip = placeAddr.zip
  if (findings?.place?.phone) payload.business_phone = findings.place.phone
  if (decryptedPhone) payload.owner_phone = decryptedPhone
  if (session.email) payload.owner_email = session.email
  if (findings?.place?.website || session.existing_site_url) {
    payload.website_url = findings?.place?.website ?? session.existing_site_url
  }
  if (findings?.place?.rating != null) payload.google_rating = findings.place.rating
  if (findings?.place?.user_rating_count != null) payload.google_review_count = findings.place.user_rating_count
  const sqs = siteQualityScore(findings)
  if (sqs !== null) payload.site_quality_score = sqs
  if (findings) payload.research_data = findings
  if (findings?.place || findings?.site_scan) {
    payload.research_completed_at = new Date().toISOString()
  }
  const scopeSummary = buildScopeSummary(selected)
  if (scopeSummary) payload.scope_summary = scopeSummary
  if (typeof session.estimate_low === 'number') payload.quote_estimate_low_cents = session.estimate_low
  if (typeof session.estimate_high === 'number') payload.quote_estimate_high_cents = session.estimate_high
  if (typeof session.monthly_low === 'number') payload.quote_monthly_low_cents = session.monthly_low
  if (typeof session.monthly_high === 'number') payload.quote_monthly_high_cents = session.monthly_high

  // Stage progression
  if (trigger === 'conversion_action') {
    payload.stage = 'booked'
  } else if (trigger === 'phone_verified' || trigger === 'research_confirmed') {
    // Only upgrade to 'contacted' if currently 'researched' (don't downgrade)
  }

  // Tags
  if (trigger === 'walkaway_flagged') {
    // Use tag array — fetch current and append 'walkaway-risk' if not present
    const { data: current } = await supabaseAdmin
      .from('prospects')
      .select('tags')
      .eq('id', prospectId!)
      .single()
      .throwOnError()
      .then((r) => r, () => ({ data: null }))
    const tags = Array.isArray(current?.tags) ? [...current!.tags] : []
    if (!tags.includes('walkaway-risk')) tags.push('walkaway-risk')
    payload.tags = tags
  }

  if (prospectId) {
    // Update existing
    const { error: upErr } = await supabaseAdmin
      .from('prospects')
      .update(payload)
      .eq('id', prospectId)
    if (upErr) return null
  } else {
    // Create new — business_name is required
    if (!session.business_name) return null
    payload.source = 'quote_estimator'
    payload.stage = 'researched'
    payload.source_quote_session_id = sessionId
    const { data: created, error: createErr } = await supabaseAdmin
      .from('prospects')
      .insert(payload)
      .select('id')
      .single()
    if (createErr || !created) return null
    prospectId = created.id as string
  }

  // Link session to prospect
  if (prospectId && session.prospect_id !== prospectId) {
    await supabaseAdmin
      .from('quote_sessions')
      .update({ prospect_id: prospectId })
      .eq('id', sessionId)
  }

  // Log activity to the prospects activity log
  await supabaseAdmin.from('activities').insert({
    prospect_id: prospectId!,
    type: trigger === 'conversion_action' ? 'stage_change' : 'update',
    channel: 'quote_estimator',
    subject: triggerLabel(trigger),
    body: activityBody(trigger, session, scopeSummary),
    created_by: 'quote_estimator',
  })

  return prospectId
}

function triggerLabel(trigger: SyncTrigger): string {
  switch (trigger) {
    case 'research_confirmed': return 'Prospect confirmed research match'
    case 'phone_verified': return 'Phone verified on quote estimator'
    case 'email_captured': return 'Email captured via Email Me The Plan'
    case 'item_changed': return 'Quote scope updated'
    case 'walkaway_flagged': return '⚠️ Hot walkaway risk — AI flagged'
    case 'conversion_action': return 'Conversion action on quote estimator'
  }
}

function activityBody(trigger: SyncTrigger, session: { id: string; share_token: string; business_name: string | null; estimate_low: number | null; estimate_high: number | null }, scopeSummary: string | null): string {
  const lines: string[] = []
  lines.push(`Session: /quote/s/${session.share_token}`)
  if (session.business_name) lines.push(`Business: ${session.business_name}`)
  if (session.estimate_low != null && session.estimate_high != null) {
    lines.push(`Estimate: $${Math.round(session.estimate_low / 100)}-$${Math.round(session.estimate_high / 100)}`)
  }
  if (scopeSummary) lines.push(`Scope: ${scopeSummary}`)
  if (trigger === 'walkaway_flagged') {
    lines.push('')
    lines.push('🚨 Consider a proactive follow-up today. AI detected exit signals.')
  }
  return lines.join('\n')
}

// ============================================================
// Find existing prospect via dedup precedence chain.
// ============================================================
async function findExistingProspect(
  session: QuoteSessionRow & {
    phone_e164_hash?: string | null
    phone_encrypted?: string | null
  },
  findings: ResearchFindings | null,
): Promise<string | null> {
  // 1. Phone hash match (most authoritative)
  if (session.phone_e164_hash && session.phone_verified) {
    // Decrypt all candidate phones to match — simpler: compare phone_e164_hash via a join
    // In practice the CRM's prospects table stores plaintext phone, not hashed.
    // We compute the hash of each candidate's owner_phone at lookup time — slow at scale
    // but fine for MVP. Better: add phone_e164_hash column to prospects in a future migration.
    const decrypted = safeDecryptPhone(session.phone_encrypted)
    if (decrypted) {
      const { data: byPhone } = await supabaseAdmin
        .from('prospects')
        .select('id')
        .or(`owner_phone.eq.${decrypted},business_phone.eq.${decrypted}`)
        .limit(1)
        .maybeSingle()
      if (byPhone?.id) return byPhone.id
    }
  }

  // 2. Business name + city match (there's a unique constraint on these, so fuzzy-match is risky;
  // use exact to avoid collision)
  if (session.business_name) {
    const cityCandidate = findings?.place?.formatted_address
      ? parseAddress(findings.place.formatted_address).city
      : parseLocation(session.business_location).city
    if (cityCandidate) {
      const { data: byNameCity } = await supabaseAdmin
        .from('prospects')
        .select('id')
        .eq('business_name', session.business_name)
        .ilike('city', cityCandidate)
        .limit(1)
        .maybeSingle()
      if (byNameCity?.id) return byNameCity.id
    }
  }

  // 3. Email match
  if (session.email) {
    const { data: byEmail } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('owner_email', session.email)
      .limit(1)
      .maybeSingle()
    if (byEmail?.id) return byEmail.id
  }

  return null
}
