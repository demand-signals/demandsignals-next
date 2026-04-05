import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ContactBot } from '@/components/layout/ContactBot'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { AccessibilityWidget } from '@/components/layout/AccessibilityWidget'
import { JsonLd } from '@/components/seo/JsonLd'
import { orgSchema, websiteSchema } from '@/lib/schema'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL('https://demandsignals.co'),
  title: {
    default: 'Demand Signals — AI-Powered Demand Generation for Local Business',
    template: '%s | Demand Signals',
  },
  description:
    'Demand Signals deploys AI agent swarms, AI-powered websites, and automated marketing systems for local businesses in Northern California. 14 clients. 3x leads. 24/7 AI.',
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
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Demand Signals',
    title: 'Demand Signals — AI-Powered Demand Generation',
    description:
      'AI agent swarms, AI websites, and automated marketing for local businesses. 14 clients. 3x leads. Always on.',
    url: 'https://demandsignals.co',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Demand Signals — AI-Powered Demand Generation',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Demand Signals — AI-Powered Demand Generation',
    description: 'AI agents + AI websites + automated marketing for local businesses.',
    images: ['/og-image.png'],
    creator: '@demandsignals',
  },
  alternates: { canonical: 'https://demandsignals.co' },
  verification: {},
  category: 'technology',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <JsonLd data={orgSchema} />
        <JsonLd data={websiteSchema} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <ContactBot />
        <CookieConsent />
        <AccessibilityWidget />
      </body>
    </html>
  )
}
