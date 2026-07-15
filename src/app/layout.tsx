import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ContactBot } from '@/components/layout/ContactBot'
import { InquiryStrip } from '@/components/layout/InquiryStrip'
import { AccessibilityWidget } from '@/components/layout/AccessibilityWidget'
import { CookieStoplight } from '@/components/layout/CookieStoplight'
import { ArcCardGame } from '@/components/sections/ArcCardGame'
import { JsonLd } from '@/components/seo/JsonLd'
import { SeoMotionFallback } from '@/components/motion/SeoMotionFallback'
import { orgSchema, websiteSchema } from '@/lib/schema'
import { Suspense } from 'react'
import { AnalyticsTracker } from '@/components/layout/AnalyticsTracker'
import { PostHogProvider } from '@/components/PostHogProvider'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans',display:'swap'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://demandsignals.co'),
  title: {
    default: 'Demand Signals — AI-Powered Demand Generation for Local Business',
    template: '%s | Demand Signals',
  },
  description:
    'Demand Signals deploys AI agent swarms, AI-powered websites, and automated marketing systems for businesses across the USA, Thailand, Australia and beyond. 3x leads. 24/7 AI.',
  keywords: [
    'AI demand generation',
    'AI marketing agency',
    'local SEO',
    'AI agents for business',
    'GEO optimization',
    'generative engine optimization',
    'AI website design',
    'Northern California marketing',
    'El Dorado County SEO',
    'Sacramento AI marketing',
  ],
  authors: [{ name: 'Demand Signals', url: 'https://demandsignals.co' }],
  creator: 'Demand Signals',
  publisher: 'Demand Signals',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Demand Signals',
    title: 'Demand Signals — AI-Powered Demand Generation',
    description:
      'AI agent swarms, AI websites, and automated marketing for businesses. 3x leads. Always on.',
    url: 'https://demandsignals.co',
    // OG image is rendered dynamically at src/app/opengraph-image.tsx
    // (edge runtime PNG). Next.js metadata API does NOT auto-inject the
    // file-convention image when openGraph is explicitly set, so we
    // reference it as an absolute URL here.
    images: [
      {
        url: 'https://demandsignals.co/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Demand Signals — AI-Powered Demand Generation',
        type: 'image/png',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Demand Signals — AI-Powered Demand Generation',
    description: 'AI agents + AI websites + automated marketing for local businesses.',
    images: ['https://demandsignals.co/opengraph-image'],
    site: '@demandsignals',
    creator: '@demandsignals',
  },
  alternates: {
    canonical: 'https://demandsignals.co',
    languages: { 'en': 'https://demandsignals.co' },
  },
  category: 'technology',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://flagcdn.com" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon-16.png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="alternate" type="application/rss+xml" title="Demand Signals Blog" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Demand Signals Blog" href="/atom.xml" />
        <link rel="alternate" type="application/feed+json" title="Demand Signals Blog" href="/feed.json" />
        <link rel="search" type="application/opensearchdescription+xml" title="Demand Signals" href="/opensearch.xml" />
        <JsonLd data={orgSchema} />
        <JsonLd data={websiteSchema} />
        <noscript>
          <style>{`[data-motion]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <SeoMotionFallback />
      </head>
      <body className="min-h-screen flex flex-col">
        <PostHogProvider>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <Header />
          <main id="main-content" className="flex-1" style={{ paddingTop: '72px' }}>
            {children}
          </main>
          <InquiryStrip />
          <ArcCardGame />
          <Footer />
          <ContactBot />
          <AccessibilityWidget />
          {/* CookieStoplight consent integration:
              - red (essential)   → PostHog opted out (zero capture);
                                    AnalyticsTracker beacon does NOT fire
              - yellow (balanced) → PostHog opted in for pageviews + UTM
                                    attribution + web vitals only (NO session
                                    replay, NO heatmaps, NO autocapture, NO
                                    dead-click recording, NO network timing);
                                    AnalyticsTracker beacon fires
              - green (all)       → Full PostHog (replay, heatmaps,
                                    autocapture, dead-click, network timing);
                                    AnalyticsTracker beacon fires; reserved
                                    for future marketing scripts (social
                                    pixels, ad tracking)
              Gates live in PostHogProvider.tsx (PostHog tier-aware config)
              and AnalyticsTracker.tsx (consent-gated beacon). The widget
              here is just the UI. */}
          <CookieStoplight />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
        </PostHogProvider>
      </body>
    </html>
  )
}
