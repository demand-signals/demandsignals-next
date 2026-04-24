// Shared channel definitions + types for prospect social/review links.

export const KNOWN_CHANNELS = [
  { key: 'website',          label: 'Website',            placeholder: 'https://example.com' },
  { key: 'google_business',  label: 'Google Business',    placeholder: 'https://g.page/...' },
  { key: 'yelp',             label: 'Yelp',               placeholder: 'https://yelp.com/biz/...' },
  { key: 'facebook',         label: 'Facebook',           placeholder: 'https://facebook.com/...' },
  { key: 'instagram',        label: 'Instagram',          placeholder: 'https://instagram.com/...' },
  { key: 'linkedin',         label: 'LinkedIn',           placeholder: 'https://linkedin.com/company/...' },
  { key: 'tiktok',           label: 'TikTok',             placeholder: 'https://tiktok.com/@...' },
  { key: 'youtube',          label: 'YouTube',            placeholder: 'https://youtube.com/@...' },
  { key: 'twitter_x',        label: 'Twitter / X',        placeholder: 'https://x.com/...' },
  { key: 'pinterest',        label: 'Pinterest',          placeholder: 'https://pinterest.com/...' },
  { key: 'bbb',              label: 'BBB',                placeholder: 'https://bbb.org/...' },
  { key: 'angi',             label: 'Angi',               placeholder: 'https://angi.com/...' },
  { key: 'trustpilot',       label: 'Trustpilot',         placeholder: 'https://trustpilot.com/review/...' },
  { key: 'nextdoor',         label: 'Nextdoor',           placeholder: 'https://nextdoor.com/...' },
] as const

export type ChannelKey = typeof KNOWN_CHANNELS[number]['key']

export interface ProspectOtherLink {
  label: string
  url: string
}

export type ProspectChannels = Partial<Record<ChannelKey, string | null>> & {
  other?: ProspectOtherLink[]
}
