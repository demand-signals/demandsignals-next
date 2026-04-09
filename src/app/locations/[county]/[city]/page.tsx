import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, serviceSchema, faqSchema, SOCIAL_PROFILES } from '@/lib/schema'
import { getCityBySlug, CITIES } from '@/lib/cities'
import { COUNTIES, getCountyBySlug, getCountyForCity } from '@/lib/counties'
import { SERVICES, SERVICE_CATEGORIES, getServicesByCategory } from '@/lib/services'
import type { ServiceCategory } from '@/lib/services'
import { BOOKING_URL } from '@/lib/constants'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

type Props = { params: Promise<{ county: string; city: string }> }

/* ── Static generation for all county/city combos ──────────── */
export function generateStaticParams() {
  const params: { county: string; city: string }[] = []
  for (const county of COUNTIES) {
    for (const citySlug of county.citySlugs) {
      params.push({ county: county.slug, city: citySlug })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { county: countySlug, city: citySlug } = await params
  const county = getCountyBySlug(countySlug)
  const city = getCityBySlug(citySlug)
  if (!county || !city || !county.citySlugs.includes(citySlug)) return {}

  const title = `Best AI Marketing Agency in ${city.name}, ${city.state} | Demand Signals`
  const description = city.seoDescription
  const url = `https://demandsignals.co/locations/${county.slug}/${city.slug}`

  return {
    title,
    description,
    keywords: city.keywords,
    openGraph: {
      title: `AI Marketing Agency — ${city.name}, CA`,
      description,
      url,
      siteName: 'Demand Signals',
      locale: 'en_US',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `Demand Signals — ${city.name} AI Marketing`, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title, description, site: '@demandsignals', creator: '@demandsignals' },
    alternates: { canonical: url },
  }
}

const PROOF = [
  { value: '10×',   label: 'avg lead volume increase' },
  { value: '68%',   label: 'lower cost per lead' },
  { value: '3 mo.', label: 'avg time to first page rank' },
  { value: '24/7',  label: 'always-on — no sick days' },
]

const CATEGORY_ORDER: ServiceCategory[] = ['websites-apps', 'demand-generation', 'content-social', 'ai-services']

const CATEGORY_INTROS: Record<ServiceCategory, { heading: (city: string) => string; text: (city: string) => string }> = {
  'websites-apps': {
    heading: (city) => `AI-powered websites & apps that rank and convert in ${city}`,
    text: (city) => `${city} consumers research online before they buy. We build the digital presence that earns their trust and their business.`,
  },
  'demand-generation': {
    heading: (city) => `Own local search in ${city} — Google, Maps, and AI`,
    text: (city) => `Three-layer discovery: Traditional SEO + GEO for AI assistants + local Map Pack domination. We capture ${city} customers on every platform they search.`,
  },
  'content-social': {
    heading: (city) => `AI content, social media, and reputation management for ${city}`,
    text: () => `Consistent content, active social presence, and spotless reputation — all running on autopilot.`,
  },
  'ai-services': {
    heading: (city) => `AI agent swarms working for your ${city} business 24/7`,
    text: () => `One monthly cost replaces multiple vendors. Our AI agents handle the work that normally takes an entire marketing team.`,
  },
}

function getCityFaqs(cityName: string, county: string) {
  return [
    {
      question: `What AI marketing services does Demand Signals offer in ${cityName}?`,
      answer: `We offer a complete suite of AI-powered marketing services for ${cityName} businesses — including custom websites, local SEO and Google Maps optimization, GEO/LLM optimization for AI search, AI content generation, social media automation, review management, AI agent swarms, and automated outreach. Every service is configured specifically for the ${cityName} market, targeting the competitors, keywords, and customer behaviors unique to ${county}.`,
    },
    {
      question: `How quickly can I expect results from AI marketing in ${cityName}?`,
      answer: `Most ${cityName} clients see measurable improvements within the first 30 days, with significant ranking gains and lead volume increases by month three. AI-powered systems work around the clock — publishing content, responding to reviews, and optimizing campaigns while you sleep. The speed of results depends on your industry's competitiveness in ${cityName}, but our three-layer discovery strategy (SEO + GEO + AEO) accelerates visibility across all channels simultaneously.`,
    },
    {
      question: `How much does AI marketing cost for a ${cityName} business?`,
      answer: `Our services are structured to replace the cost of a marketing employee or traditional agency retainer. AI-powered websites range from $5K to $25K with monthly management starting at $800. Content, reputation, and social automation packages start at $800 per month. We build custom proposals based on your ${cityName} market, competitive landscape, and business goals — and the first consultation is always free.`,
    },
    {
      question: `What makes Demand Signals the best marketing agency for ${cityName} businesses?`,
      answer: `Unlike traditional agencies that rely on manual labor and generic templates, we deploy AI agent swarms that handle content creation, review responses, social media, and outreach autonomously. This means ${cityName} businesses get enterprise-level marketing output at a fraction of the cost. We're also based in Northern California — we understand the local market dynamics that national agencies miss entirely.`,
    },
    {
      question: `Can you help my ${cityName} business appear in AI search results like ChatGPT and Perplexity?`,
      answer: `Absolutely — this is one of our core specialties. We call it GEO (Generative Engine Optimization). When ${cityName} consumers ask ChatGPT, Gemini, Perplexity, or any AI assistant for local recommendations, your business needs to be cited. We build the structured data, entity authority signals, llms.txt files, and citation network that gets your business recommended by AI — not just indexed by Google.`,
    },
  ]
}

export default async function CityHubPage({ params }: Props) {
  const { county: countySlug, city: citySlug } = await params
  const county = getCountyBySlug(countySlug)
  const city = getCityBySlug(citySlug)
  if (!county || !city || !county.citySlugs.includes(citySlug)) notFound()

  const faqs = getCityFaqs(city.name, city.county)
  const url = `https://demandsignals.co/locations/${county.slug}/${city.slug}`

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': ['LocalBusiness', 'MarketingAgency'],
          name: `Demand Signals — ${city.name} AI Marketing`,
          description: `AI-powered marketing agency serving ${city.name}, ${city.county}, CA. Websites, SEO, content, AI agents.`,
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
            { '@type': 'City', name: city.name },
            ...city.nearbyAreas.map(a => ({ '@type': 'City', name: a })),
          ],
          sameAs: SOCIAL_PROFILES,
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `AI Marketing Services for ${city.name}`,
            itemListElement: SERVICES.map(s => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: `${s.searchIntentName} in ${city.name}`,
                description: s.description.replace(/\{city\}/g, city.name).replace(/\{county\}/g, city.county),
                url: `https://demandsignals.co/${city.slug}-${s.slug}`,
              },
            })),
          },
        }}
      />
      <JsonLd data={serviceSchema(`AI Marketing — ${city.name}`, city.seoDescription, url)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Locations', url: 'https://demandsignals.co/locations' },
        { name: county.name, url: `https://demandsignals.co/locations/${county.slug}` },
        { name: city.name, url },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <PageHero
        eyebrow={`${city.name}, ${county.name}`}
        title={<>Best <span style={{ color: '#FF6B2B' }}>AI Marketing Agency</span> Near{' '}<span style={{ color: '#52C9A0' }}>{city.name}</span>, CA</>}
        subtitle={city.heroSubtitle}
        ctaLabel={`Get a Free ${city.name} Audit →`}
        ctaHref="/contact"
        callout={<>We build <span style={{ color: '#52C9A0' }}>hyper-local AI systems</span> tuned to {city.name}&apos;s specific market — from {city.localTerms[0]} to {city.localTerms[1]} and every neighborhood in between.</>}
      />

      {/* ─── Proof bar ────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <StaggerContainer style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {PROOF.map(p => (
            <StaggerItem key={p.label}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#52C9A0', lineHeight: 1 }}>{p.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginTop: 6 }}>{p.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ─── Market context ───────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'start' }}>
          <ScrollReveal direction="left">
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>The Market</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 20, lineHeight: 1.2 }}>
                Why {city.name} businesses choose AI marketing
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
                {city.description} Key commercial areas like {city.localTerms.slice(0, 3).join(', ')} anchor the local economy, while neighborhoods such as {city.localTerms.slice(3).join(' and ')} define the community&apos;s identity.
              </p>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                Demand Signals is based in El Dorado County. We know this market — from the businesses along {city.localTerms[0]} to the customers searching from {city.localTerms[1]}. Our AI systems are configured for {city.name}&apos;s specific competitive landscape, not cookie-cutter national campaigns.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Industries we serve in {city.name}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                {city.industries.map(ind => (
                  <span key={ind} style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 16px', fontSize: '0.875rem', color: 'var(--dark)', fontWeight: 500 }}>
                    {ind}
                  </span>
                ))}
              </div>
              <div className="city-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                {city.stats.map(s => (
                  <div key={s.label} style={{ background: 'var(--light)', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--teal)', fontWeight: 800, fontSize: '1.2rem' }}>{s.value}</div>
                    <div style={{ color: 'var(--slate)', fontSize: '0.72rem', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Also serving nearby</p>
              <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.7 }}>{city.nearbyAreas.join(' · ')}</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── All Services — 4 category sections, all 23 services ── */}
      {CATEGORY_ORDER.map((catKey, idx) => {
        const cat = SERVICE_CATEGORIES[catKey]
        const services = getServicesByCategory(catKey)
        const intro = CATEGORY_INTROS[catKey]
        const bgColor = idx % 2 === 0 ? 'var(--light)' : '#fff'

        return (
          <section key={catKey} style={{ background: bgColor, padding: '80px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <ScrollReveal direction="up">
                <p style={{ color: cat.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{cat.label}</p>
                <h2 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 12, maxWidth: 600 }}>
                  {intro.heading(city.name)}
                </h2>
                <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 44, lineHeight: 1.7 }}>
                  {intro.text(city.name)}
                </p>
              </ScrollReveal>

              <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {services.map(s => (
                  <StaggerItem key={s.slug}>
                    <Link
                      href={`/${city.slug}-${s.slug}`}
                      style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                    >
                      <div style={{
                        background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
                        padding: '28px 24px', height: '100%', display: 'flex', flexDirection: 'column',
                        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cat.color }} />
                        <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>{s.icon}</div>
                        <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10, lineHeight: 1.3 }}>
                          {s.searchIntentName} in {city.name}
                        </h3>
                        <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.65, flex: 1, marginBottom: 16 }}>
                          {s.tagline}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                          {s.features.slice(0, 3).map(f => (
                            <span key={f} style={{
                              background: 'var(--light)', borderRadius: 100,
                              padding: '3px 10px', fontSize: '0.7rem',
                              color: 'var(--slate)', fontWeight: 500,
                            }}>
                              {f}
                            </span>
                          ))}
                        </div>
                        <span style={{ color: cat.color, fontWeight: 600, fontSize: '0.85rem' }}>
                          Learn More →
                        </span>
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </section>
        )
      })}

      {/* ─── What sets us apart — dark section ────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Why Demand Signals</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 16, maxWidth: 560, lineHeight: 1.2 }}>
              We replace a marketing team — not just a single tactic
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 48, lineHeight: 1.7 }}>
              Whether your customers are in {city.localTerms[0]}, {city.localTerms[2]}, or anywhere near {city.name} — our AI systems find them, engage them, and convert them.
            </p>
          </ScrollReveal>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {city.features.map(f => (
              <StaggerItem key={f.title}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 28px', height: '100%' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', marginBottom: 12 }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{f.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Nearby Areas / Internal linking ──────────────────── */}
      <section style={{ background: 'var(--light)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal direction="up">
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Serving {city.name} and nearby communities
            </p>
            <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 24px' }}>
              Our AI marketing systems serve businesses across {city.county} and the surrounding region. If your customers are here, we can reach them.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {city.nearbyAreas.map(area => (
                <span key={area} style={{
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 100, padding: '8px 18px',
                  fontSize: '0.875rem', color: 'var(--dark)', fontWeight: 500,
                }}>
                  {area}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <FaqAccordion faqs={faqs} />

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <AnimatedCTA
        heading={`Ready to grow your ${city.name} business?`}
        text={`Book a free 15-minute call. We'll audit your current local search presence, show you exactly where competitors are beating you, and lay out what AI marketing fixes it.`}
        primaryLabel={`Get a Free ${city.name} Audit →`}
        primaryHref="/contact"
        secondaryLabel="Book a Free Call"
        secondaryHref={BOOKING_URL}
      />

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @media (max-width: 640px) {
          .city-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
