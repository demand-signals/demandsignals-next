import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ContactBot } from '@/components/layout/ContactBot'
import { SITE_NAME } from '@/lib/constants'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — AI-Powered Demand Generation`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Demand Signals is an AI-first demand generation agency. We build websites, deploy AI agents, automate workflows, and dominate local and generative search — so your business gets found everywhere that matters.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'),
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <ContactBot />
      </body>
    </html>
  )
}
