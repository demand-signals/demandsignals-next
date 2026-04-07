import type { Metadata } from 'next'

type BuildMetadataOptions = {
  title: string
  description: string
  path: string          // e.g. '/services/websites'
  keywords?: string[]
  ogTitle?: string      // defaults to title
  ogDescription?: string // defaults to description
  twitterTitle?: string  // defaults to title
  twitterDescription?: string // defaults to description
  noIndex?: boolean
}

const SITE_URL = 'https://demandsignals.co'
const OG_IMAGE = '/og-image.png'

export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
  noIndex = false,
}: BuildMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`

  return {
    /* ── Primary ─────────────────────────────────────── */
    title,
    description,
    ...(keywords.length > 0 && { keywords }),

    /* ── Indexing ─────────────────────────────────────── */
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },

    /* ── Open Graph (social preview cards) ───────────── */
    openGraph: {
      title:       ogTitle ?? title,
      description: ogDescription ?? description,
      url,
      type:        'website',
      siteName:    'Demand Signals',
      locale:      'en_US',
      images: [{
        url:    OG_IMAGE,
        width:  1200,
        height: 630,
        alt:    ogTitle ?? title,
      }],
    },

    /* ── Twitter / X Card ────────────────────────────── */
    twitter: {
      card:        'summary_large_image',
      title:       twitterTitle ?? ogTitle ?? title,
      description: twitterDescription ?? ogDescription ?? description,
      images:      [OG_IMAGE],
      creator:     '@demandsignals',
    },

    /* ── Canonical URL ────────────────────────────────── */
    alternates: { canonical: url },
  }
}
