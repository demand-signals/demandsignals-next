// /book — native on-site booking page (§29 — replaces external
// Google Appointment Schedules link). Server component owns metadata
// + JSON-LD; client component owns slot picker + submit.

import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { BUSINESS_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE } from '@/lib/constants'
import { BookPageClient } from './BookPageClient'

export const metadata: Metadata = buildMetadata({
  title: 'Book a Free Strategy Call | Demand Signals',
  description:
    'Book a free 20-minute strategy call with Demand Signals. We’ll audit your current setup, show you what’s broken, and give you a tailored roadmap. No obligation.',
  path: '/book',
  keywords: [
    'book strategy call',
    'free marketing consultation',
    'Demand Signals booking',
    'AI marketing strategy call',
    'free website audit',
  ],
})

export default function BookPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ReservationPackage',
          name: 'Free Strategy Call with Demand Signals',
          description:
            'Free 20-minute strategy call with a Demand Signals senior strategist. Live audit, 3-point roadmap emailed same-day, no-obligation quote.',
          provider: {
            '@type': 'Organization',
            '@id': 'https://demandsignals.co/#organization',
            name: 'Demand Signals',
            url: 'https://demandsignals.co',
            telephone: CONTACT_PHONE,
            email: CONTACT_EMAIL,
            address: {
              '@type': 'PostalAddress',
              streetAddress: BUSINESS_ADDRESS.street,
              addressLocality: BUSINESS_ADDRESS.city,
              addressRegion: BUSINESS_ADDRESS.state,
              postalCode: BUSINESS_ADDRESS.zip,
              addressCountry: 'US',
            },
          },
        }}
      />
      <main>
        {/* Dark hero */}
        <section
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, #1c2a4a 0%, #0a0f1c 70%, #060912 100%)',
            color: '#fff',
            padding: '96px 24px 72px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 16px',
                background: 'rgba(82,201,160,0.15)',
                border: '1px solid rgba(82,201,160,0.3)',
                borderRadius: 100,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#52c9a0',
                  boxShadow: '0 0 10px #52c9a0',
                }}
              />
              <span
                style={{
                  color: '#52C9A0',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                20 MIN · FREE · NO OBLIGATION
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                margin: '0 0 20px',
                maxWidth: 800,
              }}
            >
              Book your free strategy call.
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 640,
                margin: '0 0 36px',
                lineHeight: 1.6,
              }}
            >
              Pick a 20-minute slot below. We’ll audit your current setup live, draft a 3-point roadmap,
              and email it the same day. If we’re not a fit, you’ll know in the first 5 minutes.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                maxWidth: 700,
              }}
            >
              {[
                ['01', '5-min audit', 'We review your current stack live'],
                ['02', '3-pt roadmap', 'Tailored quick wins, emailed same-day'],
                ['03', 'Fixed quote', 'No retainers. Scoped. No surprises.'],
              ].map(([n, t, d]) => (
                <div
                  key={n}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#52C9A0',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    {n}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Booking form */}
        <section style={{ background: 'var(--light, #f4f6f9)', padding: '64px 24px 96px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <BookPageClient />
          </div>
        </section>
      </main>
    </>
  )
}
