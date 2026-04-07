import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, serviceSchema, faqSchema } from '@/lib/schema'
import { getCityBySlug, CITY_SLUGS } from '@/lib/cities'
import { BOOKING_URL } from '@/lib/constants'
import { PageHero } from '@/components/sections/PageHero'
import { AnimatedServiceCards } from '@/components/sections/AnimatedServiceCards'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

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
    icon: '🌐',
    title: 'AI-Powered Website',
    description: 'Fast, modern websites built to rank in Google and convert local visitors into phone calls and booked appointments. Includes local schema, city-specific landing pages, and Core Web Vitals optimization.',
    href: '/websites-apps',
    features: ['Local schema & structured data', 'Core Web Vitals optimized', 'AI content pipeline included'],
  },
  {
    icon: '📍',
    title: 'Local SEO & Google Maps',
    description: 'Full Google Business Profile management, local citation building, and on-page SEO targeting your city\'s highest-intent searches. We own the Map Pack for your service categories.',
    href: '/demand-generation/gbp-admin',
    features: ['GBP management & optimization', 'Citation building & cleanup', 'Map Pack ranking strategy'],
  },
  {
    icon: '🤖',
    title: 'AI Agent Swarms',
    description: 'Networks of AI agents handling content creation, review management, outreach, and analytics — running 24/7 without a team. One monthly cost replaces multiple vendors.',
    href: '/ai-services/ai-agent-swarms',
    features: ['24/7 autonomous operation', 'Replaces multiple vendors', 'Content + reviews + outreach'],
  },
  {
    icon: '🔍',
    title: 'GEO & AI Search Optimization',
    description: 'Optimize your business to appear when locals ask ChatGPT, Gemini, or Perplexity for recommendations. Structured data, entity signals, and citation authority built for the AI era.',
    href: '/demand-generation/geo-aeo-llm-optimization',
    features: ['AI assistant citation building', 'Structured data & entity signals', 'llms.txt optimization'],
  },
  {
    icon: '✍️',
    title: 'Content Marketing',
    description: 'City-specific blog posts, service pages, and local guides published on a consistent schedule. Builds topical authority and long-tail organic traffic month after month.',
    href: '/content-social/ai-content-generation',
    features: ['City-specific local content', 'Consistent publishing schedule', 'Topical authority building'],
  },
  {
    icon: '📧',
    title: 'AI Outreach',
    description: 'Automated prospecting sequences that research local leads, craft personalized messages, and route interested replies directly to your inbox. No SDR required.',
    href: '/ai-services/ai-automated-outreach',
    features: ['Automated lead research', 'Personalized outreach sequences', 'Reply routing to your inbox'],
  },
]

const PROOF = [
  { value: '10×',   label: 'avg lead volume increase' },
  { value: '68%',   label: 'lower cost per lead' },
  { value: '3 mo.', label: 'avg time to first page rank' },
  { value: '24/7',  label: 'always-on — no sick days' },
]

function getCityFaqs(cityName: string, county: string) {
  return [
    {
      question: `What services does Demand Signals offer in ${cityName}?`,
      answer: `We offer a full suite of AI-powered marketing services for ${cityName} businesses — including custom websites, local SEO and Google Maps optimization, AI content generation, review management, social media automation, and AI agent swarms. Every service is configured specifically for the ${cityName} market, targeting the competitors, keywords, and customer behaviors unique to ${county}.`,
    },
    {
      question: `How quickly can I expect results from AI marketing in ${cityName}?`,
      answer: `Most ${cityName} clients see measurable improvements within the first 30 days, with significant ranking gains and lead volume increases by month three. AI-powered systems work around the clock — publishing content, responding to reviews, and optimizing campaigns while you sleep. The speed of results depends on your industry's competitiveness in ${cityName}, but our three-layer discovery strategy (SEO + GEO + AEO) accelerates visibility across all channels simultaneously.`,
    },
    {
      question: `Do you work with businesses outside ${cityName}?`,
      answer: `Yes. While we have deep expertise in ${cityName} and the broader ${county} market, we serve businesses across all of Northern California and beyond. Our AI systems can be configured for any geographic market. Many of our ${cityName}-area clients also have service areas that extend into neighboring cities, and we build multi-location strategies that capture demand across every community they serve.`,
    },
    {
      question: `What makes Demand Signals different from other ${cityName} marketing agencies?`,
      answer: `Unlike traditional agencies that rely on manual labor and generic templates, we deploy AI agent swarms that handle content creation, review responses, social media, and outreach autonomously. This means ${cityName} businesses get enterprise-level marketing output at a fraction of the cost. We are also based in Northern California, so we understand the local market dynamics that national agencies miss entirely.`,
    },
    {
      question: `How much does AI marketing cost for a ${cityName} business?`,
      answer: `Our services are structured to replace the cost of a marketing employee or traditional agency retainer. AI-powered websites range from $5K to $25K with monthly management starting at $800. Content, reputation, and social automation packages start at $800 per month. We build custom proposals based on your ${cityName} market, competitive landscape, and business goals — and the first consultation is always free.`,
    },
  ]
}

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params
  const city = getCityBySlug(citySlug)
  if (!city) notFound()

  const faqs = getCityFaqs(city.name, city.county)

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
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Locations', url: 'https://demandsignals.co/locations' },
        { name: city.name, url: `https://demandsignals.co/locations/${city.slug}` },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      {/* ─── Hero — particle canvas + parallax ─────────────────── */}
      <PageHero
        eyebrow={`${city.name}, ${city.county}`}
        title={<><span style={{color:'#FF6B2B'}}>AI Marketing</span> for{' '}<span style={{color:'#52C9A0'}}>{city.name}</span>{' '}Businesses</>}
        subtitle={city.heroSubtitle}
        ctaLabel={`Get a Free ${city.name} Audit →`}
        ctaHref="/contact"
        callout={<>We build <span style={{color:'#52C9A0'}}>hyper-local AI systems</span> tuned to {city.name}&apos;s specific competitors, keywords, and customers — not national templates that ignore your market.</>}
      />

      {/* ─── Proof bar ────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <StaggerContainer style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {PROOF.map((p) => (
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
                {city.description}
              </p>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                Demand Signals is based in El Dorado County. We know this market — the competition, the customer behavior, and the channels that actually drive leads. Our AI systems are configured for Northern California, not cookie-cutter national campaigns.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
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
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Services ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>What we deliver</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 12, maxWidth: 600 }}>
              Full-stack AI marketing for {city.name}
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 52, lineHeight: 1.7 }}>
              Every service below is tuned to the {city.name} market — your competitors, your customers, and the search terms that drive real local demand.
            </p>
          </ScrollReveal>
          <AnimatedServiceCards services={SERVICES} />
        </div>
      </section>

      {/* ─── What sets us apart — dark section ────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Why Demand Signals</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 48, maxWidth: 560, lineHeight: 1.2 }}>
              We replace a marketing team — not just a single tactic
            </h2>
          </ScrollReveal>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {city.features.map((f) => (
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

      {/* ─── FAQ — animated accordion ─────────────────────────── */}
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
    </>
  )
}
