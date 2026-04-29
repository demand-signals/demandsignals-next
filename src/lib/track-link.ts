// ── track-link.ts ───────────────────────────────────────────────────
// Tag a magic-link URL with UTM parameters so when the recipient
// clicks, the destination page can attribute the visit to the channel
// + medium that delivered it. Hunter directive 2026-04-29: granular
// tracking, UTM the links if you need.
//
// Source: dsig (always — owns the brand)
// Medium: 'email' | 'sms' | 'manual_share' | 'admin_link'
// Campaign: 'invoice' | 'sow' | 'receipt' | 'quote_share' | …
// Content: doc number ('INV-DOCK-042926A', 'SOW-MOME-042426A', etc.)
//          — surfaces granular per-doc analytics in any UTM-aware tool.
//
// The ClientTracker session_start beacon picks up these UTM params off
// window.location.search and stamps them on the activity row, so the
// prospect timeline can show "Opened invoice — utm_medium=email,
// utm_content=INV-DOCK-042926A" if you ever need that level.

export type LinkMedium = 'email' | 'sms' | 'manual_share' | 'admin_link'
export type LinkCampaign =
  | 'invoice'
  | 'sow'
  | 'receipt'
  | 'quote_share'
  | 'booking_confirm'
  | 'booking_reminder'
  | 'inquiry_followup'

export interface TrackLinkOptions {
  medium: LinkMedium
  campaign: LinkCampaign
  /** Doc number like 'INV-XXX' or 'SOW-XXX' — populates utm_content. */
  content?: string
  /** Email send_id — populates utm_term so individual sends can be split. */
  send_id?: string
}

/**
 * Append UTM query params to a URL. Preserves any existing query +
 * fragment. Idempotent — re-tagging the same URL replaces existing
 * UTMs rather than duplicating them.
 */
export function trackLink(rawUrl: string, opts: TrackLinkOptions): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl  // malformed input — return as-is, don't crash
  }

  url.searchParams.set('utm_source', 'dsig')
  url.searchParams.set('utm_medium', opts.medium)
  url.searchParams.set('utm_campaign', opts.campaign)
  if (opts.content) url.searchParams.set('utm_content', opts.content)
  if (opts.send_id) url.searchParams.set('utm_term', opts.send_id)

  return url.toString()
}
