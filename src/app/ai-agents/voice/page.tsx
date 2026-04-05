import { PageHero } from '@/components/sections/PageHero'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'AI Voice Systems — Answer Every Call, Book Every Appointment',
  description:
    'AI voice agents that qualify leads, book appointments, answer FAQs, and follow up 24/7 — without a human receptionist. Never miss a call again. Serving local businesses in Northern California.',
  keywords: [
    'AI voice agent local business',
    'AI receptionist Northern California',
    'automated call answering Sacramento',
    'AI appointment booking',
    'voice AI lead qualification',
    'after-hours call handling El Dorado County',
    'AI phone system small business',
  ],
  openGraph: {
    title: 'AI Voice Systems — Answer Every Call, Book Every Appointment',
    description:
      'AI voice agents that qualify leads, book appointments, answer FAQs, and follow up 24/7 — without a human receptionist.',
    url: 'https://demandsignals.co/ai-agents/voice',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI Voice Systems — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Voice Systems for Local Business',
    description: 'Your phone answered every call, every time. AI voice agents for lead qualification, booking, and FAQs.',
  },
  alternates: { canonical: 'https://demandsignals.co/ai-agents/voice' },
}

const useCases = [
  {
    title: 'Inbound Call Handling',
    description:
      'Every call gets answered instantly with a natural-sounding voice agent that understands context, answers questions, and routes callers appropriately.',
  },
  {
    title: 'Appointment Booking',
    description:
      'Your AI agent checks your calendar, offers available slots, confirms bookings, and sends reminders — all in a single phone conversation.',
  },
  {
    title: 'Lead Qualification',
    description:
      'Callers are walked through a qualification sequence and scored before the conversation ever reaches your team. Only the right leads get through.',
  },
  {
    title: 'After-Hours Coverage',
    description:
      'Nights, weekends, holidays — your phone is always answered. Leads captured after-hours are logged and followed up by the time you open.',
  },
]

const integrations = [
  'Google Calendar',
  'Calendly',
  'Your CRM (HubSpot, GHL, and more)',
  'SMS follow-up sequences',
]

export default function VoicePage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'AI Voice Systems',
          'AI voice agents that qualify leads, book appointments, answer FAQs, and follow up 24/7 — without a human receptionist.',
          'https://demandsignals.co/ai-agents/voice',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'AI Agents', url: 'https://demandsignals.co/ai-agents' },
          { name: 'AI Voice Systems', url: 'https://demandsignals.co/ai-agents/voice' },
        ])}
      />
      <PageHero
        eyebrow="AI Voice Systems"
        title={
          <>
            Your Phone Answered.{' '}
            <span style={{ color: '#52C9A0' }}>Every Call. Every Time.</span>
          </>
        }
        subtitle="AI voice agents that qualify leads, book appointments, answer FAQs, and follow up — without a human receptionist."
        ctaLabel="See a Demo"
        ctaHref="/contact"
      />

      {/* Callout stat */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.4,
            borderLeft: 'none',
            margin: 0,
            padding: 0,
          }}>
            "The average business misses{' '}
            <span style={{ color: '#52C9A0' }}>62% of calls.</span>{' '}
            Our voice agents answer every one."
          </blockquote>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            What It Handles
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 560 }}>
            Use Cases
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 520, marginBottom: 56, lineHeight: 1.7 }}>
            A single voice agent can handle multiple call types simultaneously — no hold times, no voicemail, no missed opportunities.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {useCases.map((uc) => (
              <div
                key={uc.title}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>
                  {uc.title}
                </h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.97rem' }}>{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Plug-and-Play
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
              Integrates With Your Stack
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Your voice agent connects to the tools you already use. Appointments land directly on your calendar. Lead data flows straight into your CRM. Follow-up texts fire automatically.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {integrations.map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'var(--light)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px 24px',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
                <span style={{ color: 'var(--dark)', fontWeight: 600, fontSize: '0.97rem' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
            Hear it for yourself.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            We'll walk you through a live demo of an AI voice agent handling real call scenarios — appointment booking, lead qualification, FAQ handling — in under 15 minutes.
          </p>
          <a
            href="/contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '15px 36px',
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 100,
              textDecoration: 'none',
            }}
          >
            See a Demo →
          </a>
        </div>
      </section>
    </>
  )
}
