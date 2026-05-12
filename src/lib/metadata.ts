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
    title: { absolute: title }, // bypass layout-level template; page titles already include brand suffix
    description,
    ...(keywords.length > 0 && { keywords }),

    /* ── Indexing ─────────────────────────────────────── */
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1, 'max-video-preview': -1 } },

    /* ── Open Graph (social preview cards) ───────────── */
    // NOTE: `images` intentionally omitted — Next.js auto-injects the
    // dynamic OG image from src/app/opengraph-image.tsx (App Router
    // convention). Hardcoding a URL here would shadow the dynamic image
    // with a 404 static asset. Same reason `images:` is omitted from
    // root layout.tsx openGraph + twitter blocks.
    openGraph: {
      title:       ogTitle ?? title,
      description: ogDescription ?? description,
      url,
      type:        'website',
      siteName:    'Demand Signals',
      locale:      'en_US',
    },

    /* ── Twitter / X Card ────────────────────────────── */
    twitter: {
      card:        'summary_large_image',
      title:       twitterTitle ?? ogTitle ?? title,
      description: twitterDescription ?? ogDescription ?? description,
      site:        '@demandsignals',
      creator:     '@demandsignals',
    },

    /* ── Canonical URL ────────────────────────────────── */
    alternates: { canonical: url },
  }
}
