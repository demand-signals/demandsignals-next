import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema, SOCIAL_PROFILES } from '@/lib/schema'
import { COUNTY_SLUGS, getCountyBySlug, getCountyCities } from '@/lib/counties'
import { SERVICES, SERVICE_CATEGORIES, getServicesByCategory } from '@/lib/services'
import type { ServiceCategory } from '@/lib/services'
import { BOOKING_URL } from '@/lib/constants'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

type Props = { params: Promise<{ county: string }> }

export function generateStaticParams() {
  return COUNTY_SLUGS.map(slug => ({ county: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countySlug } = await params
  const county = getCountyBySlug(countySlug)
  if (!county) return {}

  const title = `Best AI Marketing Agency in ${county.name}, CA | Demand Signals`
  const description = `Top AI marketing services for ${county.name} businesses. ${county.businessCount} local businesses served. AI websites, local SEO, GEO optimization, and AI agent swarms. ${county.featured ? 'Our home county.' : ''}`
  const url = `https://demandsignals.co/locations/${county.slug}`

  return {
    title,
    description,
    keywords: [
      `AI marketing ${county.name}`,
      `marketing agency ${county.name} CA`,
      `local SEO ${county.name}`,
      `digital marketing ${county.shortName}`,
      `best marketing agency ${county.name}`,
      `AI websites ${county.name}`,
    ],
    openGraph: {
      title: `AI Marketing — ${county.name}, CA`,
      description,
      url,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `Demand Signals — ${county.name} AI Marketing` }],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  }
}

const CATEGORY_ORDER: ServiceCategory[] = ['websites-apps', 'demand-generation', 'content-social', 'ai-services']

function getCountyFaqs(countyName: string, shortName: string, businessCount: string) {
  return [
    {
      question: `What AI marketing services does Demand Signals offer in ${countyName}?`,
      answer: `We offer a complete AI marketing suite for ${countyName} businesses: AI-powered websites, local SEO & Google Maps optimization, GEO/LLM optimization for AI search engines, AI content generation, social media automation, review management, AI agent swarms, and automated outreach. Every service is configured for the ${shortName} market — targeting the competitors, keywords, and customer behaviors unique to each city in the county.`,
    },
    {
      question: `How many businesses does Demand Signals serve in ${countyName}?`,
      answer: `${countyName} has ${businessCount} local businesses, and we serve clients across every major city in the county. Our AI systems are configured specifically for the ${shortName} market — we know the competition, the seasonal patterns, and the customer behaviors that drive local business success here.`,
    },
    {
      question: `Why choose a local ${countyName} marketing agency over a national one?`,
      answer: `A national agency runs the same playbook for ${countyName} that they run for Miami or Chicago. We live and work here. We know which ${shortName} businesses are dominating local search, which neighborhoods are growing fastest, and which industries are underserved. That local intelligence gets baked into every AI system we build — and it\'s something no remote agency can replicate.`,
    },
    {
      question: `What makes AI marketing different from traditional marketing in ${countyName}?`,
      answer: `Traditional marketing relies on manual labor — someone writing blog posts, someone managing social media, someone responding to reviews. AI marketing deploys autonomous agents that handle all of this 24/7, at a fraction of the cost. For ${countyName} businesses, this means enterprise-level marketing output without the enterprise-level headcount. Our AI agent swarms publish content, respond to reviews, manage social media, and generate leads around the clock.`,
    },
    {
      question: `How quickly can I expect results from AI marketing in ${countyName}?`,
      answer: `Most ${countyName} clients see measurable improvements within 30 days — improved rankings, increased review velocity, and consistent content publishing. Significant lead volume increases typically happen by month three. Our three-layer discovery strategy (SEO + GEO + AEO) accelerates results by building visibility across Google, AI Overviews, and answer engines simultaneously.`,
    },
  ]
}

export default async function CountyHubPage({ params }: Props) {
  const { county: countySlug } = await params
  const county = getCountyBySlug(countySlug)
  if (!county) notFound()

  const cities = getCountyCities(county)
  const faqs = getCountyFaqs(county.name, county.shortName, county.businessCount)
  const url = `https://demandsignals.co/locations/${county.slug}`

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': ['LocalBusiness', 'MarketingAgency'],
          name: `Demand Signals — ${county.name} AI Marketing`,
          description: `AI-powered marketing agency serving businesses across ${county.name}, California.`,
          url,
          telephone: '+1-916-542-2423',
          email: 'DemandSignals@gmail.com',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '5170 Golden Foothills Pkwy',
            addressLocality: 'El Dorado Hills',
            addressRegion: 'CA',
            postalCode: '95762',
            addressCountry: 'US',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 38.6621,
            longitude: -121.0530,
          },
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '10:00',
            closes: '20:00',
          },
          image: 'https://demandsignals.co/logo.png',
          priceRange: '$',
          areaServed: [
            { '@type': 'AdministrativeArea', name: county.name },
            ...cities.map(c => ({ '@type': 'City', name: c.name })),
          ],
          sameAs: SOCIAL_PROFILES,
        }}
      />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Locations', url: 'https://demandsignals.co/locations' },
        { name: county.name, url },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <PageHero
        eyebrow={county.subtitle}
        title={<>Best AI Marketing Agency in{' '}<span style={{ color: county.color }}>{county.name}</span></>}
        subtitle={county.description}
        ctaLabel={`Get a Free ${county.shortName} Audit →`}
        ctaHref="/contact"
        callout={<>We serve {cities.length} cities across {county.name} with <span style={{ color: '#52C9A0' }}>AI-powered marketing systems</span> built for this market — not templates imported from another state.</>}
      />

      {/* ── Business Stats ───────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <StaggerContainer style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {county.stats.map(s => (
            <StaggerItem key={s.label}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: county.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: 6 }}>{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ── City Cards Grid ──────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ color: county.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Cities We Serve
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, marginBottom: 16 }}>
                {cities.length} City Markets in{' '}<span style={{ color: county.color }}>{county.name}</span>
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Each city has its own competitive landscape, customer base, and search behavior. We build AI marketing systems configured for each market individually.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {cities.map(city => (
              <StaggerItem key={city.slug}>
                <Link
                  href={`/locations/${county.slug}/${city.slug}`}
                  style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                >
                  <div style={{
                    background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: '28px 24px', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: county.color }} />
                    <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.15rem', marginBottom: 8 }}>{city.name}</h3>
                    <p style={{ color: 'var(--slate)', fontSize: '0.85rem', marginBottom: 12 }}>{city.population} residents</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {city.industries.slice(0, 4).map(ind => (
                        <span key={ind} style={{
                          background: '#fff', border: '1px solid var(--border)', borderRadius: 100,
                          padding: '3px 10px', fontSize: '0.7rem', color: 'var(--slate)', fontWeight: 500,
                        }}>
                          {ind}
                        </span>
                      ))}
                    </div>
                    <span style={{ color: county.color, fontWeight: 600, fontSize: '0.85rem' }}>
                      View All Services →
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Top Industries ───────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: county.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Market Intelligence
              </p>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: 16 }}>
                Top Industries in {county.name}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                We serve businesses across every industry in {county.name}. Here are the sectors driving the most demand in this market.
              </p>
            </div>
          </ScrollReveal>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {county.topIndustries.map(ind => (
              <span key={ind} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 100, padding: '10px 24px', fontSize: '0.95rem',
                color: '#fff', fontWeight: 500,
              }}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Overview ────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Full-Stack AI Marketing
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: 16 }}>
                23 Services Available Across {county.name}
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Every city page links to city-specific landing pages for each service. Select a city above to explore.
              </p>
            </div>
          </ScrollReveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
            {CATEGORY_ORDER.map(catKey => {
              const cat = SERVICE_CATEGORIES[catKey]
              const services = getServicesByCategory(catKey)
              return (
                <div key={catKey}>
                  <div style={{ height: 3, width: 48, background: cat.color, borderRadius: 2, marginBottom: 16 }} />
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>{cat.label}</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {services.map(s => (
                      <li key={s.slug}>
                        <Link href={s.parentHref} style={{ color: 'var(--slate)', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{s.icon}</span>
                          <span>{s.shortName}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <FaqAccordion faqs={faqs} />

      {/* ── CTA ──────────────────────────────────────────────── */}
      <AnimatedCTA
        heading={`Ready to grow your ${county.name} business?`}
        text={`Book a free 15-minute call. We'll audit your current visibility in the ${county.shortName} market and show you exactly where AI marketing can move the needle.`}
        primaryLabel={`Get a Free ${county.shortName} Audit →`}
        primaryHref="/contact"
        secondaryLabel="Book a Free Call"
        secondaryHref={BOOKING_URL}
      />
    </>
  )
}
