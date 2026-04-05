import { PageHero } from '@/components/sections/PageHero'
import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:              'AI-Powered Outreach — Email & LinkedIn at Scale',
  description:        'Hyper-personalized email and LinkedIn outreach sequences that fill your pipeline while you focus on closing. 3–8x higher reply rates powered by AI. Serving Northern California businesses.',
  path:               '/ai-agents/outreach',
  keywords:           [
    'AI outreach agency Northern California',
    'automated email outreach Sacramento',
    'LinkedIn outreach automation',
    'AI sales outreach local business',
    'hyper-personalized email sequences',
    'B2B outreach automation El Dorado County',
    'AI SDR replacement',
  ],
  ogDescription:      'Hyper-personalized outreach sequences across email and LinkedIn. 3–8x higher reply rates. Fill your pipeline while you close.',
  twitterTitle:       'AI-Powered Outreach for Local Business',
  twitterDescription: 'A full outreach team at a fraction of the cost. 3–8x higher reply rates from AI personalization at scale.',
})

const included = [
  {
    title: 'Email Sequence Writing & Sending',
    description:
      'Multi-step email campaigns written by AI, personalized at the individual level, and sent from a warmed domain that lands in the inbox — not spam.',
  },
  {
    title: 'LinkedIn Connection + Message Sequences',
    description:
      'Targeted connection requests and follow-up message threads that start real conversations on the platform where your buyers spend their time.',
  },
  {
    title: 'Follow-Up Cadences',
    description:
      'Automated follow-up sequences that space touchpoints intelligently — persistent enough to cut through the noise, never annoying enough to burn a prospect.',
  },
  {
    title: 'CRM Updates',
    description:
      'Every touch, open, click, and reply is logged automatically in your CRM. Your pipeline stays accurate without anyone updating it manually.',
  },
  {
    title: 'Reply Handling & Routing',
    description:
      'Positive replies are flagged, categorized, and routed to the right person immediately. You find out about hot leads the moment they respond.',
  },
]

export default function OutreachPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'AI-Powered Outreach',
          'Hyper-personalized outreach sequences across email and LinkedIn that fill your pipeline while you focus on closing — powered by AI at scale.',
          'https://demandsignals.co/ai-agents/outreach',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'AI Agents', url: 'https://demandsignals.co/ai-agents' },
          { name: 'AI-Powered Outreach', url: 'https://demandsignals.co/ai-agents/outreach' },
        ])}
      />
      <PageHero
        eyebrow="AI-Powered Outreach"
        title={
          <>
            A <span style={{color:'#52C9A0'}}>Full Outreach Team.</span> At a{' '}
            <span style={{color:'#FF6B2B'}}>Fraction of the Cost.</span>
          </>
        }
        subtitle="Hyper-personalized outreach sequences across email and LinkedIn that fill your pipeline while you focus on closing."
        ctaLabel="Start Outreach Campaign"
        ctaHref="/contact"
        callout={<>A good SDR costs <span style={{color:'#52C9A0'}}>$60,000–$90,000/year</span> and sends 40–60 emails a day. Our AI outreach agents send thousands — personalized, researched, and on-brand.</>}
      />

      {/* What's Included */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Everything Covered
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 600 }}>
            What's Included
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 520, marginBottom: 56, lineHeight: 1.7 }}>
            We handle the entire outreach function — research, writing, sending, follow-up, and pipeline hygiene — so your team can focus exclusively on conversations that are already warm.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {included.map((item, i) => (
              <div
                key={item.title}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                  display: 'flex',
                  gap: 28,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(82,201,160,0.12)',
                  border: '1px solid rgba(82,201,160,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: 'var(--teal)',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem' }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>
            Results
          </p>
          <div style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 20 }}>
            3–8<span style={{ color: '#52C9A0' }}>×</span>
          </div>
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
            higher reply rates vs. generic outreach — because AI personalization at scale makes every message feel like it was written specifically for that one person.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#fff', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
            Start filling your pipeline this week.
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Share your ICP and we'll build a campaign strategy in 48 hours — including target list, channel mix, and projected reply volumes before you commit.
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
            Start Outreach Campaign →
          </a>
        </div>
      </section>
    </>
  )
}
