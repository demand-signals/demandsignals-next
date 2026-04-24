// Shared channel definitions + types for prospect social/review links.

// ─── Type discrimination ───────────────────────────────────────────────────────

export interface ReviewChannelEntry {
  url: string | null
  rating: number | null         // 0–5
  review_count: number | null   // integer
  last_synced_at: string | null // ISO timestamp
}

export type SimpleChannelEntry = string | null  // just a URL

// ─── Channel registries ───────────────────────────────────────────────────────

export const REVIEW_CHANNELS = [
  { key: 'google_business', label: 'Google Business', placeholder: 'https://g.page/...' },
  { key: 'yelp',            label: 'Yelp',            placeholder: 'https://yelp.com/biz/...' },
  { key: 'facebook',        label: 'Facebook',        placeholder: 'https://facebook.com/...' },
  { key: 'trustpilot',      label: 'Trustpilot',      placeholder: 'https://trustpilot.com/review/...' },
  { key: 'bbb',             label: 'BBB',             placeholder: 'https://bbb.org/...' },
  { key: 'angi',            label: 'Angi',            placeholder: 'https://angi.com/...' },
  { key: 'nextdoor',        label: 'Nextdoor',        placeholder: 'https://nextdoor.com/...' },
] as const

export const SIMPLE_CHANNELS = [
  { key: 'website',   label: 'Website',     placeholder: 'https://example.com' },
  { key: 'linkedin',  label: 'LinkedIn',    placeholder: 'https://linkedin.com/company/...' },
  { key: 'tiktok',    label: 'TikTok',      placeholder: 'https://tiktok.com/@...' },
  { key: 'youtube',   label: 'YouTube',     placeholder: 'https://youtube.com/@...' },
  { key: 'instagram', label: 'Instagram',   placeholder: 'https://instagram.com/...' },
  { key: 'twitter_x', label: 'Twitter / X', placeholder: 'https://x.com/...' },
  { key: 'pinterest', label: 'Pinterest',   placeholder: 'https://pinterest.com/...' },
] as const

// ─── Key types ────────────────────────────────────────────────────────────────

export type ReviewChannelKey = typeof REVIEW_CHANNELS[number]['key']
export type SimpleChannelKey = typeof SIMPLE_CHANNELS[number]['key']
export type ChannelKey = ReviewChannelKey | SimpleChannelKey

// ─── Composite channels map type ──────────────────────────────────────────────

export interface ProspectOtherLink {
  label: string
  url: string
}

export type ProspectChannels = {
  [K in SimpleChannelKey]?: SimpleChannelEntry
} & {
  [K in ReviewChannelKey]?: ReviewChannelEntry | null
} & {
  other?: ProspectOtherLink[]
}

// ─── Runtime type guard ───────────────────────────────────────────────────────

export function isReviewChannel(key: string): key is ReviewChannelKey {
  return REVIEW_CHANNELS.some((c) => c.key === key)
}

// ─── Normalizers — handle legacy string shape and new object shape ─────────────

/** Accept string-from-legacy-data OR object-new-shape, always return full object. */
export function normalizeReviewChannel(value: unknown): ReviewChannelEntry {
  if (typeof value === 'string') {
    return { url: value || null, rating: null, review_count: null, last_synced_at: null }
  }
  if (value && typeof value === 'object' && 'url' in value) {
    const v = value as Partial<ReviewChannelEntry>
    return {
      url: typeof v.url === 'string' ? v.url || null : null,
      rating: typeof v.rating === 'number' ? v.rating : null,
      review_count: typeof v.review_count === 'number' ? v.review_count : null,
      last_synced_at: typeof v.last_synced_at === 'string' ? v.last_synced_at : null,
    }
  }
  return { url: null, rating: null, review_count: null, last_synced_at: null }
}

/** Defensive: if somehow a review-channel object ends up in a simple slot, extract the URL. */
export function normalizeSimpleChannel(value: unknown): string | null {
  if (typeof value === 'string') return value || null
  if (value && typeof value === 'object' && 'url' in value) {
    const u = (value as { url?: unknown }).url
    return typeof u === 'string' ? u || null : null
  }
  return null
}
