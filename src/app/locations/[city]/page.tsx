import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ParticleCanvas } from '@/components/sections/HeroCanvas'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, serviceSchema } from '@/lib/schema'
import { getCityBySlug, CITY_SLUGS } from '@/lib/cities'
import { BOOKING_URL } from '@/lib/constants'

type Props = { params: Promise<{ city: string }> }

export function generateStaticParams() {
  return CITY_SLUGS.map((slug) => ({ city: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = getCityBySlug(citySlug)
  if (!city) return {}

  return {
    title: `AI Marketing Agency in ${city.name}, ${city.state} | Demand Signals`,
    description: city.seoDescription,
    keywords: city.keywords,
    openGraph: {
      title: `AI Marketing Agency in ${city.name}, CA`,
      description: city.seoDescription,
      url: `https://demandsignals.co/locations/${city.slug}`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `Demand Signals — ${city.name} AI Marketing` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `AI Marketing for ${city.name} Businesses`,
      description: city.seoDescription,
    },
    alternates: { canonical: `https://demandsignals.co/locations/${city.slug}` },
  }
}

const SERVICES = [
  {
    title: 'AI-Powered Website',
    description: 'Fast, modern websites built to rank in Google and convert local visitors into phone calls and booked appointments. Includes local schema, city-specific landing pages, and Core Web Vitals optimization.',
    href: '/websites-apps',
  },
  {
    title: 'Local SEO & Google Maps',
    description: 'Full Google Business Profile management, local citation building, and on-page SEO targeting your city\'s highest-intent searches. We own the Map Pack for your service categories.',
    href: '/demand-generation/gbp-admin',
  },
  {
    title: 'AI Agent Swarms',
    description: 'Networks of AI agents handling content creation, review management, outreach, and analytics — running 24/7 without a team. One monthly cost replaces multiple vendors.',
    href: '/ai-services/ai-agent-swarms',
  },
  {
    title: 'GEO & AI Search Optimization',
    description: 'Optimize your business to appear when locals ask ChatGPT, Gemini, or Perplexity for recommendations. Structured data, entity signals, and citation authority built for the AI era.',
    href: '/demand-generation/geo-aeo-llm-optimization',
  },
  {
    title: 'Content Marketing',
    description: 'City-specific blog posts, service pages, and local guides published on a consistent schedule. Builds topical authority and long-tail organic traffic month after month.',
    href: '/content-social/ai-content-generation',
  },
  {
    title: 'AI Outreach',
    description: 'Automated prospecting sequences that research local leads, craft personalized messages, and route interested replies directly to your inbox. No SDR required.',
    href: '/ai-services/ai-automated-outreach',
  },
]

const PROOF = [
  { value: '10×',   label: 'avg lead volume increase' },
  { value: '68%',   label: 'lower cost per lead' },
  { value: '3 mo.', label: 'avg time to first page rank' },
  { value: '24/7',  label: 'always-on — no sick days' },
]

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params
  const city = getCityBySlug(citySlug)
  if (!city) notFound()

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': ['LocalBusiness', 'MarketingAgency'],
          name: 'Demand Signals',
          description: `AI-powered marketing agency serving ${city.name}, ${city.county}, CA`,
          url: `https://demandsignals.co/locations/${city.slug}`,
          telephone: '+1-916-542-2423',
          email: 'DemandSignals@gmail.com',
          areaServed: [
            { '@type': 'City', name: city.name },
            ...city.nearbyAreas.map((a) => ({ '@type': 'City', name: a })),
          ],
        }}
      />
      <JsonLd data={serviceSchema(`AI Marketing — ${city.name}`, city.seoDescription, `https://demandsignals.co/locations/${city.slug}`)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Locations', url: 'https://demandsignals.co/locations' },
          { name: city.name, url: `https://demandsignals.co/locations/${city.slug}` },
        ])}
      />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section style={{ minHeight: '52vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#080e1f' }}>
        <ParticleCanvas />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'linear-gradient(to bottom, rgba(8,14,31,0.5) 0%, rgba(8,14,31,0.7) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 30, maxWidth: 1200, margin: '0 auto', padding: '96px 24px 80px', width: '100%', textAlign: 'center' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(82,201,160,0.15)', border: '1px solid rgba(82,201,160,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ color: '#52C9A0', fontSize: '0.85rem', fontWeight: 600 }}>{city.name}, {city.county}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}>
              <span style={{color:'#FF6B2B'}}>AI Marketing</span> for{' '}
              <span style={{color:'#52C9A0'}}>{city.name}</span>{' '}
              Businesses
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.2rem)', color: 'rgba(255,255,255,0.72)', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.65 }}>
              {city.heroSubtitle}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 32px', background: '#FF6B2B', color: '#fff', fontWeight: 700, fontSize: '1rem', borderRadius: 100, textDecoration: 'none', boxShadow: '0 4px 24px rgba(255,107,43,0.35)' }}>
                Get a Free {city.name} Audit →
              </Link>
              <a href={BOOKING_URL} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 30px', border: '2px solid rgba(255,255,255,0.5)', color: '#fff', background: 'rgba(255,255,255,0.15)', fontWeight: 600, fontSize: '1rem', borderRadius: 100, textDecoration: 'none' }}>
                Book a Free Call
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Proof bar ────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {PROOF.map((p) => (
            <div key={p.label}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#52C9A0', lineHeight: 1 }}>{p.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginTop: 6 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Market context ───────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'start' }}>
          <div>
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>The Market</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 20, lineHeight: 1.2 }}>
              Why {city.name} businesses choose AI marketing
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
              {city.description}
            </p>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8 }}>
              Demand Signals is based in El Dorado County. We know this market — the competition, the customer behavior, and the channels that actually drive leads. Our AI systems are configured for Northern California, not cookie-cutter national campaigns.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Industries we serve in {city.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {city.industries.map((ind) => (
                <span key={ind} style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 16px', fontSize: '0.875rem', color: 'var(--dark)', fontWeight: 500 }}>
                  {ind}
                </span>
              ))}
            </div>
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Also serving nearby</p>
            <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.7 }}>{city.nearbyAreas.join(' · ')}</p>
          </div>
        </div>
      </section>

      {/* ─── Services ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>What we deliver</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 12, maxWidth: 600 }}>
            Full-stack AI marketing for {city.name}
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 52, lineHeight: 1.7 }}>
            Every service below is tuned to the {city.name} market — your competitors, your customers, and the search terms that drive real local demand.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {SERVICES.map((svc) => (
              <Link key={svc.href} href={svc.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 30px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12, transition: 'box-shadow 0.2s' }}
                  className="city-card">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)' }}>{svc.title}</h3>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', flex: 1 }}>{svc.description}</p>
                  <span style={{ color: '#FF6B2B', fontWeight: 600, fontSize: '0.875rem' }}>Learn more →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What sets us apart ───────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Why Demand Signals</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 48, maxWidth: 560, lineHeight: 1.2 }}>
            We replace a marketing team — not just a single tactic
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {city.features.map((f) => (
              <div key={f.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 28px' }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', marginBottom: 12 }}>{f.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, fontSize: '0.95rem' }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section style={{ background: 'var(--light)', padding: '88px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
            Ready to grow your {city.name} business?
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Book a free 15-minute call. We'll audit your current local search presence, show you exactly where competitors are beating you, and lay out what AI marketing fixes it.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '15px 36px', background: '#FF6B2B', color: '#fff', fontWeight: 700, fontSize: '1rem', borderRadius: 100, textDecoration: 'none' }}>
              Get a Free {city.name} Audit →
            </Link>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 32px', border: '2px solid rgba(0,0,0,0.15)', color: 'var(--dark)', background: '#fff', fontWeight: 600, fontSize: '1rem', borderRadius: 100, textDecoration: 'none' }}>
              Book a Free Call
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
