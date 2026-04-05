import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, serviceSchema } from '@/lib/schema'
import { CITIES, getCityBySlug, CITY_SLUGS } from '@/lib/cities'
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
    title: `AI Marketing Agency — ${city.name}, ${city.state} | Demand Signals`,
    description: city.seoDescription,
    keywords: city.keywords,
    openGraph: {
      title: `AI Marketing Agency — ${city.name}, CA`,
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

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params
  const city = getCityBySlug(citySlug)
  if (!city) notFound()

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'MarketingAgency'],
    name: 'Demand Signals',
    description: `AI-powered marketing agency serving ${city.name}, ${city.county}, CA`,
    url: `https://demandsignals.co/locations/${city.slug}`,
    telephone: '+1-916-542-2423',
    email: 'DemandSignals@gmail.com',
    areaServed: [
      { '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: 'California' } },
      ...city.nearbyAreas.map((area) => ({ '@type': 'City', name: area })),
    ],
    knowsAbout: ['Local SEO', 'AI Marketing', 'GEO Optimization', 'AI Agent Swarms', 'Digital Marketing'],
  }

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <JsonLd
        data={serviceSchema(
          `AI Marketing — ${city.name}`,
          city.seoDescription,
          `https://demandsignals.co/locations/${city.slug}`,
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Locations', url: 'https://demandsignals.co/locations' },
          { name: city.name, url: `https://demandsignals.co/locations/${city.slug}` },
        ])}
      />

      <PageHero
        eyebrow={`${city.name}, ${city.county}`}
        title={<>{city.heroTitle.replace(`AI Marketing for ${city.name} Businesses`, '').trim() || city.heroTitle}{' '}<span style={{ color: '#52C9A0' }}>{city.name}</span></>}
        subtitle={city.heroSubtitle}
        ctaLabel="Get a Free Local Audit"
        ctaHref="/contact"
      />

      {/* Stats */}
      <section style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, textAlign: 'center' }}>
            {city.stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ color: 'var(--slate)', marginTop: 10, fontSize: '1rem', lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the market */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                The {city.name} Market
              </p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 20 }}>
                Why {city.name} Businesses Need AI Marketing
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 24 }}>
                {city.description}
              </p>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                Demand Signals deploys AI-powered websites, local SEO systems, and agent swarms specifically tuned for the {city.name} market — helping businesses capture more customers without hiring a full marketing team.
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Industries We Serve in {city.name}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {city.industries.map((industry) => (
                  <span
                    key={industry}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: 100,
                      padding: '8px 18px',
                      fontSize: '0.875rem',
                      color: 'var(--dark)',
                      fontWeight: 500,
                    }}
                  >
                    {industry}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 32 }}>
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', marginBottom: 12 }}>
                  <strong>Also serving nearby:</strong>
                </p>
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {city.nearbyAreas.join(' · ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Services */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            What We Do in {city.name}
          </p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 640 }}>
            AI Marketing Services Built for {city.name}
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 56, lineHeight: 1.7 }}>
            Every strategy is tuned to the {city.name} market — your competitors, your customers, and your specific growth opportunities.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {city.features.map((feature) => (
              <div
                key={feature.title}
                style={{
                  background: 'var(--light)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.97rem' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core services cross-sell */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Full-Stack AI Marketing
          </p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 16, maxWidth: 560 }}>
            Everything {city.name} Businesses Need to Win
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 48, lineHeight: 1.7 }}>
            We don't sell individual tactics. We deploy complete AI-powered demand generation systems — every channel, every touchpoint, running 24/7.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { label: 'AI-Powered Websites', href: '/services/websites' },
              { label: 'Local SEO & GBP', href: '/services/gmb' },
              { label: 'AI Agent Swarms', href: '/ai-agents/agent-farms' },
              { label: 'GEO & AI Search', href: '/ai-agents/geo-llm' },
              { label: 'Content Marketing', href: '/services/content' },
              { label: 'AI Outreach', href: '/ai-agents/outreach' },
            ].map((service) => (
              <a
                key={service.href}
                href={service.href}
                className="service-link-dark"
                style={{
                  display: 'block',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                {service.label} →
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--light)', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
            Ready to grow your {city.name} business?
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Book a free 15-minute call. We'll audit your current {city.name} search presence and show you exactly where your competitors are beating you — and how AI fixes it.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
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
              Get a Free {city.name} Audit →
            </a>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 32px',
                border: '2px solid rgba(0,0,0,0.2)',
                color: 'var(--dark)',
                background: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: 100,
                textDecoration: 'none',
              }}
            >
              Book a Free Call
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
