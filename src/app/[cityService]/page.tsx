import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema, howToSchema, SOCIAL_PROFILES } from '@/lib/schema'
import { getCityBySlug, CITIES } from '@/lib/cities'
import { getServiceBySlug, getServicesByCategory, SERVICE_CATEGORIES } from '@/lib/services'
import { getCountyForCity } from '@/lib/counties'
import { getCityServiceBySlug, getAllCityServiceParams } from '@/lib/city-service-slugs'
import { BOOKING_URL } from '@/lib/constants'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

type Props = { params: Promise<{ cityService: string }> }

/* ── Static generation for all city×service combos + aliases ──── */
export function generateStaticParams() {
  return getAllCityServiceParams()
}

/* ── Template replacement helper ─────────────────────────────── */
function fillTemplate(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{city\}/g, vars.city)
    .replace(/\{county\}/g, vars.county)
    .replace(/\{state\}/g, vars.state)
}

/* ── Metadata ─────────────────────────────────────────────────── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cityService } = await params
  const match = getCityServiceBySlug(cityService)
  if (!match) return {}

  const city = getCityBySlug(match.citySlug)
  const service = getServiceBySlug(match.serviceSlug)
  if (!city || !service) return {}

  const vars = { city: city.name, county: city.county, state: city.state }
  const canonicalSlug = `${city.slug}-${service.slug}`
  const title = `Best ${service.searchIntentName} in ${city.name}, ${city.state}`
  const rawDesc = `Top ${service.searchIntentName.toLowerCase()} for ${city.name} businesses. ${fillTemplate(service.tagline, vars)}.`
  const description = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc
  const url = `https://demandsignals.co/${canonicalSlug}`
  const keywords = service.keywordTemplates.map(k => fillTemplate(k, vars))

  return {
    title,
    description,
    keywords: [...keywords, `best ${service.searchIntentName.toLowerCase()} ${city.name}`, `top ${service.shortName.toLowerCase()} in ${city.name}`, `${service.shortName.toLowerCase()} near me ${city.name}`, `best ${service.shortName.toLowerCase()} near me`],
    openGraph: {
      title: `Best ${service.searchIntentName} in ${city.name}, ${city.state}`,
      description,
      url,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${service.searchIntentName} in ${city.name} — Demand Signals` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Best ${service.searchIntentName} in ${city.name}`,
      description,
    },
    alternates: { canonical: url },
  }
}

/* ── Category-specific content for Three-Layer Discovery & HowTo */
function getDiscoveryBullets(category: string) {
  const map: Record<string, { seo: string[]; geo: string[]; aeo: string[] }> = {
    'websites-apps': {
      seo: ['Page speed & Core Web Vitals optimization', 'Technical crawl & indexability audit', 'On-page meta, headings & internal links', 'Mobile-first responsive architecture'],
      geo: ['Schema markup for AI-parseable site structure', 'Structured FAQ & HowTo for AI Overviews', 'Entity signals linking site to local business', 'Performance metrics AI models reward'],
      aeo: ['llms.txt implementation & maintenance', 'Portfolio & case study content for citation', 'Technology stack authority signals', 'Conversational content for AI assistants'],
    },
    'demand-generation': {
      seo: ['Local keyword clustering & gap analysis', 'Google Business Profile optimization', 'Citation building & NAP consistency', 'Competitor rank tracking & strategy'],
      geo: ['Local entity & brand signal amplification', 'AI Overview snippet optimization', 'Structured review & rating markup', 'Map Pack ranking factors'],
      aeo: ['llms.txt with full service catalog', 'Question-first FAQ content structure', 'Third-party citation & directory network', 'Review velocity & sentiment signals'],
    },
    'content-social': {
      seo: ['Blog & pillar page keyword targeting', 'Content calendar with buyer intent mapping', 'Internal link mesh for topical authority', 'Rich snippet & featured snippet targeting'],
      geo: ['Content formatted for AI synthesis', 'Author entity & E-E-A-T signals', 'Structured data on every content piece', 'Multi-format content for AI extraction'],
      aeo: ['llms.txt for content indexing', 'Conversational Q&A content blocks', 'Brand mention consistency across platforms', 'Social proof signals for AI trust'],
    },
    'ai-services': {
      seo: ['Technical SEO for AI service landing pages', 'Long-tail "AI + [service]" keyword targeting', 'Case study & results-driven content', 'Schema markup for AI service offerings'],
      geo: ['AI capability structured data', 'Technology & platform authority signals', 'Implementation methodology content', 'Results & metrics formatted for AI extraction'],
      aeo: ['llms.txt with AI capability catalog', 'Detailed use-case & ROI content', 'Integration & technology partner signals', 'Thought leadership for AI recommendation'],
    },
  }
  return map[category] || map['demand-generation']
}

function getHowToSteps(category: string, cityName: string, serviceName: string, countyName: string, localTerms: string[]) {
  const base = {
    'websites-apps': [
      { name: `Free ${cityName} Website Audit`, text: `We audit your current website's performance, design, SEO health, and conversion rate — benchmarking against competitors in ${cityName} and across ${countyName}.` },
      { name: 'Architecture & Design Proposal', text: `We present a custom site architecture, wireframes, and technology recommendation tailored to your ${cityName} business goals and target customers near ${localTerms[0]} and ${localTerms[1]}.` },
      { name: 'AI-Accelerated Development', text: `Our team builds your site using AI-assisted development workflows — shipping faster without sacrificing quality, performance, or SEO best practices.` },
      { name: 'Launch, Monitor & Iterate', text: `We launch with full SEO markup, monitor Core Web Vitals and rankings across the ${cityName} market, and iterate based on real user data and search performance.` },
    ],
    'demand-generation': [
      { name: `Free ${cityName} Market Audit`, text: `We analyze your current search visibility, Google Business Profile, local citations, and competitor positioning across ${cityName} — from ${localTerms[0]} to ${localTerms[2]}.` },
      { name: 'Custom Demand Gen Strategy', text: `A detailed plan targeting ${cityName}'s competitive landscape — keyword gaps, citation opportunities, and AI search optimization specific to your industry in ${countyName}.` },
      { name: 'AI-Powered Implementation', text: `Our AI agent swarms deploy the strategy — building citations, publishing optimized content, managing your GBP, and monitoring rankings around the clock.` },
      { name: 'Ongoing Optimization & Reporting', text: `Continuous rank tracking, A/B testing, and AI-driven adjustments ensure your visibility improves month over month across every ${cityName} search channel.` },
    ],
    'content-social': [
      { name: `Free ${cityName} Content Audit`, text: `We review your existing content, social presence, review response rate, and competitor content strategy across the ${cityName} and ${countyName} market.` },
      { name: 'Content & Social Strategy', text: `A publishing calendar, brand voice guide, and multi-channel distribution plan targeting ${cityName} customers searching near ${localTerms[0]} and ${localTerms[1]}.` },
      { name: 'AI Content Production', text: `Our AI content systems produce blog posts, social updates, review responses, and repurposed content on autopilot — maintaining your brand voice while scaling output.` },
      { name: 'Performance Tracking & Refinement', text: `We track engagement, search rankings, review sentiment, and content performance across ${cityName} — continuously refining the strategy based on real data.` },
    ],
    'ai-services': [
      { name: `Free ${cityName} AI Readiness Assessment`, text: `We evaluate your current operations, identify automation opportunities, and benchmark your AI adoption against competitors in the ${cityName} and ${countyName} market.` },
      { name: 'Custom AI Implementation Plan', text: `A phased roadmap with ROI projections, technology recommendations, and change management strategy tailored to your ${cityName} business operations.` },
      { name: 'AI System Deployment', text: `We build, configure, and deploy AI systems — from agent swarms to private LLMs — with monitoring dashboards and human-in-the-loop safeguards.` },
      { name: 'Optimization & Expansion', text: `Continuous monitoring, model tuning, and capability expansion as your ${cityName} business grows and new AI opportunities emerge.` },
    ],
  }
  return base[category as keyof typeof base] || base['demand-generation']
}

/* ── Related cities (same county, excluding current) ──────────── */
function getRelatedCities(currentSlug: string, county: string) {
  return CITIES.filter(c => c.county === county && c.slug !== currentSlug).slice(0, 5)
}

/* ── Related services (same category, excluding current) ──────── */
function getRelatedServices(currentSlug: string, category: string) {
  return getServicesByCategory(category as 'websites-apps' | 'demand-generation' | 'content-social' | 'ai-services')
    .filter(s => s.slug !== currentSlug)
}

/* ══════════════════════════════════════════════════════════════════
   ROOT-LEVEL LONG-TAIL PAGE — /{city}-{service}
   SEO / GEO / AEO optimized: "Best", "Near Me", "Top" keyword density,
   search-intent service names, business stats (not income),
   structured data (LocalBusiness + Service + FAQ + Breadcrumb + HowTo),
   factual density, direct answer format, internal link mesh.
   ══════════════════════════════════════════════════════════════════ */
export default async function CityServiceLTP({ params }: Props) {
  const { cityService } = await params
  const match = getCityServiceBySlug(cityService)
  if (!match) notFound()

  const city = getCityBySlug(match.citySlug)
  const service = getServiceBySlug(match.serviceSlug)
  if (!city || !service) notFound()

  const county = getCountyForCity(city.slug)
  const vars = { city: city.name, county: city.county, state: city.state }
  const fill = (t: string) => fillTemplate(t, vars)
  const canonicalSlug = `${city.slug}-${service.slug}`
  const url = `https://demandsignals.co/${canonicalSlug}`

  const faqs = service.faqTemplates.map(f => ({
    question: fill(f.question),
    answer: fill(f.answer),
  }))

  const relatedCities = getRelatedCities(city.slug, city.county)
  const relatedServices = getRelatedServices(service.slug, service.category)
  const catMeta = SERVICE_CATEGORIES[service.category]

  return (
    <>
      {/* ─── JSON-LD: LocalBusiness ───────────────────────────── */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': ['LocalBusiness', 'ProfessionalService'],
          '@id': `${url}#business`,
          name: `Demand Signals — Best ${service.searchIntentName} in ${city.name}`,
          description: `Top ${service.searchIntentName.toLowerCase()} services for ${city.name}, ${city.county} businesses. ${fill(service.tagline)}.`,
          url,
          telephone: '+1-916-542-2423',
          email: 'DemandSignals@gmail.com',
          address: {
            '@type': 'PostalAddress',
            addressLocality: city.name,
            addressRegion: city.state,
            addressCountry: 'US',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: city.geo.lat,
            longitude: city.geo.lng,
          },
          areaServed: [
            { '@type': 'City', name: city.name },
            ...city.nearbyAreas.map(a => ({ '@type': 'City', name: a })),
          ],
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '10:00',
            closes: '20:00',
          },
          image: 'https://demandsignals.co/logo.png',
          priceRange: '$',
          sameAs: SOCIAL_PROFILES,
        }}
      />
      {/* ─── JSON-LD: Service ─────────────────────────────────── */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `Best ${service.searchIntentName} in ${city.name}, ${city.state}`,
          description: fill(service.description),
          url,
          provider: { '@id': 'https://demandsignals.co/#organization' },
          areaServed: {
            '@type': 'City',
            name: city.name,
            containedInPlace: {
              '@type': 'AdministrativeArea',
              name: city.county,
            },
          },
          serviceType: service.name,
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `${service.searchIntentName} Features`,
            itemListElement: service.features.map((f, i) => ({
              '@type': 'Offer',
              '@id': `${url}#feature-${i}`,
              itemOffered: { '@type': 'Service', name: f },
            })),
          },
        }}
      />
      {/* ─── JSON-LD: Breadcrumb ──────────────────────────────── */}
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Locations', url: 'https://demandsignals.co/locations' },
        ...(county ? [{ name: county.name, url: `https://demandsignals.co/locations/${county.slug}` }] : []),
        { name: city.name, url: `https://demandsignals.co/locations/${county?.slug}/${city.slug}` },
        { name: service.searchIntentName, url },
      ])} />
      {/* ─── JSON-LD: FAQ ─────────────────────────────────────── */}
      <JsonLd data={faqSchema(faqs)} />
      {/* ─── JSON-LD: HowTo ──────────────────────────────────── */}
      <JsonLd data={howToSchema(
        `How to Find the Best ${service.searchIntentName} in ${city.name}`,
        `Step-by-step process for ${city.name} businesses to get top ${service.name.toLowerCase()} with Demand Signals.`,
        getHowToSteps(service.category, city.name, service.name.toLowerCase(), city.county, city.localTerms),
      )} />

      {/* ─── Hero — "Best [service] in [city]" ──────────────── */}
      <PageHero
        eyebrow={`${service.categoryLabel} · ${city.name}, ${city.county}`}
        title={
          <>
            Best <span style={{ color: catMeta.color }}>{service.searchIntentName}s</span>
            {' '}in{' '}
            <span style={{ color: '#52C9A0' }}>{city.name}</span>
          </>
        }
        subtitle={`Searching for the best ${service.name.toLowerCase()} near me in ${city.name}? Demand Signals delivers AI-powered ${service.name.toLowerCase()} built for the ${city.county} market — not national templates.`}
        ctaLabel={`Get a Free ${city.name} Audit →`}
        ctaHref="/contact"
        callout={
          <>
            Every {service.name.toLowerCase()} strategy we deploy in {city.name} is built from local data — from {city.localTerms[0]} to {city.localTerms[1]} and every corridor in between.{' '}
            <span style={{ color: '#52C9A0' }}>AI-powered, locally informed.</span>
          </>
        }
      />

      {/* ─── Proof bar ────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <StaggerContainer style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {city.stats.map(s => (
            <StaggerItem key={s.label}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#52C9A0', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginTop: 6 }}>{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ─── Deep content: Why Best [service] in [city] ──────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'start' }}>
            <ScrollReveal direction="left">
              <div>
                <p style={{ color: catMeta.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Top {service.searchIntentName} Services
                </p>
                <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 20, lineHeight: 1.2 }}>
                  Why {city.name} businesses need the best {service.name.toLowerCase()}
                </h2>
                <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
                  {city.name} is one of the most competitive local markets in {city.county}. With a population of {city.population} residents, a thriving local business ecosystem spanning areas like {city.localTerms.slice(0, 3).join(', ')}, the demand for professional {service.name.toLowerCase()} is significant — and so is the competition.
                </p>
                <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
                  Consumers in {city.name} are digitally savvy. Whether they&apos;re searching from {city.localTerms[0]} or browsing near {city.localTerms[1]}, they search Google for &ldquo;best {service.searchIntentName.toLowerCase()} near me&rdquo; and &ldquo;{service.name.toLowerCase()} in {city.name}&rdquo;, ask ChatGPT for recommendations, read reviews on Google Maps, and compare options before making a decision. If your business isn&apos;t visible across all of these channels, you&apos;re losing customers to competitors who are.
                </p>
                <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                  Demand Signals is headquartered in El Dorado County. We don&apos;t just serve {city.name} — we know the neighborhoods, from {city.localTerms.slice(-3).join(' to ')}. Our {service.name.toLowerCase()} strategies are built on first-hand knowledge of {city.county}&apos;s competitive dynamics, consumer behavior, and business ecosystem.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div>
                <p style={{ color: catMeta.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                  What&apos;s Included
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {service.features.map((f, i) => (
                    <div key={f} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      background: 'var(--light)', borderRadius: 12, padding: '16px 20px',
                    }}>
                      <div style={{
                        background: catMeta.color, color: '#fff', fontWeight: 800,
                        borderRadius: 8, width: 32, height: 32, minWidth: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem',
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <span style={{ color: 'var(--dark)', fontWeight: 600, fontSize: '0.95rem' }}>{f}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── How It Works — AEO-optimized direct answer ──────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <p style={{ color: '#52C9A0', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>
              How It Works
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 16, textAlign: 'center', lineHeight: 1.2 }}>
              How to Get the Best {service.name} Placements Near Me in {city.name}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 640, margin: '0 auto 48px', textAlign: 'center', lineHeight: 1.7 }}>
              Four steps from audit to results. No long-term contracts. No hidden fees. Just measurable growth.
            </p>
          </ScrollReveal>

          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {getHowToSteps(service.category, city.name, service.name.toLowerCase(), city.county, city.localTerms).map((s, i) => ({ step: String(i + 1).padStart(2, '0'), title: s.name, desc: s.text })).map(s => (
              <StaggerItem key={s.step}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '28px 24px', height: '100%',
                }}>
                  <div style={{ color: catMeta.color, fontWeight: 800, fontSize: '1.5rem', marginBottom: 12 }}>{s.step}</div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10, lineHeight: 1.3 }}>{s.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Three-layer discovery strategy (SEO + GEO + AEO) ── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>
              Our Approach
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, textAlign: 'center', lineHeight: 1.2 }}>
              Three-layer discovery: SEO + GEO + AEO
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 660, margin: '0 auto 48px', textAlign: 'center', lineHeight: 1.7 }}>
              When {city.name} customers search &ldquo;{service.name.toLowerCase()}{' '}near me,&rdquo; they discover businesses through multiple channels. We optimize all three layers simultaneously.
            </p>
          </ScrollReveal>

          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
            {(() => {
              const catBullets = getDiscoveryBullets(service.category)
              return [
              {
                label: 'SEO — Traditional Search',
                color: '#3B82F6',
                desc: `Ranking #1 in Google for "best ${service.searchIntentName.toLowerCase()} near ${city.name}" and hundreds of related search terms targeting ${city.localTerms[0]}, ${city.localTerms[2]}, and surrounding areas. On-page optimization, technical SEO, local schema markup, and content strategy that builds topical authority.`,
                bullets: catBullets.seo,
              },
              {
                label: 'GEO — AI Search (Google AI Overviews)',
                color: '#52C9A0',
                desc: `Getting your ${city.name} business cited in Google AI Overviews, which now appear on 48%+ of searches. "Best ${service.searchIntentName.toLowerCase()} near me" is the #1 Maps search pattern — if you aren't in the AI Overview, you're losing that traffic.`,
                bullets: catBullets.geo,
              },
              {
                label: 'AEO — Answer Engines (ChatGPT, Perplexity)',
                color: '#FF6B2B',
                desc: `Ensuring your ${city.name} business is recommended when consumers ask "Who is the best ${service.searchIntentName.toLowerCase()} near me in ${city.name}?" Our llms.txt, entity signals, and citation network make you the answer.`,
                bullets: catBullets.aeo,
              },
            ]})().map(layer => (
              <StaggerItem key={layer.label}>
                <div style={{
                  background: 'var(--light)',
                  border: '1px solid var(--border)',
                  borderRadius: 16, padding: '28px 24px', height: '100%',
                }}>
                  <div style={{ height: 4, width: 48, background: layer.color, borderRadius: 2, marginBottom: 16 }} />
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>{layer.label}</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: 16 }}>{layer.desc}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {layer.bullets.map(b => (
                      <li key={b} style={{ color: 'var(--slate)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: layer.color, fontWeight: 700 }}>✓</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Industries in [city] ─────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: catMeta.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Industries We Serve
              </p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
                Top {service.searchIntentName} for every{' '}<span style={{ color: catMeta.color }}>{city.name}</span> industry
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                From medical practices near {city.localTerms[0]} to restaurants along {city.localTerms[1]} — we configure the best {service.name.toLowerCase()} strategies for your specific competitive landscape in {city.name}.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, maxWidth: 900, margin: '0 auto' }}>
            {city.industries.map(ind => (
              <StaggerItem key={ind}>
                <div style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '18px 20px', textAlign: 'center',
                }}>
                  <span style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 500 }}>{ind}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Related services in [city] ─────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                More Services in {city.name}
              </p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
                Complete AI marketing suite for{' '}<span style={{ color: '#FF6B2B' }}>{city.name}</span> businesses
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                {service.searchIntentName} is just one part of our full-stack AI marketing system. From {city.localTerms[0]} to {city.localTerms.slice(-2).join(' and ')} — explore everything we offer across {city.name}.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16, maxWidth: 1000, margin: '0 auto',
          }}>
            {relatedServices.map(rs => (
              <StaggerItem key={rs.slug}>
                <Link
                  href={`/${city.slug}-${rs.slug}`}
                  style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                >
                  <div style={{
                    background: 'var(--light)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '24px 22px', height: '100%',
                    transition: 'border-color 0.2s, transform 0.2s',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>{rs.icon}</div>
                    <div style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
                      {rs.searchIntentName}
                    </div>
                    <div style={{ color: catMeta.color, fontSize: '0.8rem', fontWeight: 600 }}>
                      View in {city.name} →
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 36 }}>
            <Link
              href={service.parentHref}
              style={{
                display: 'inline-block',
                background: catMeta.color, color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                textDecoration: 'none', padding: '12px 28px', borderRadius: 100,
              }}
            >
              Learn More About {service.name} →
            </Link>
            {county && (
              <Link
                href={`/locations/${county.slug}/${city.slug}`}
                style={{
                  display: 'inline-block',
                  background: 'var(--teal)', color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                  textDecoration: 'none', padding: '12px 28px', borderRadius: 100,
                }}
              >
                ← All {city.name} Services
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── Nearby cities — same service ────────────────────── */}
      {relatedCities.length > 0 && (
        <section style={{ background: 'var(--light)', padding: '56px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <ScrollReveal direction="up">
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Best {service.searchIntentName} Near Me — {city.county}
              </p>
              <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 24px' }}>
                Searching for {service.name.toLowerCase()} near me? We serve businesses across {city.county}. Select a nearby city:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {relatedCities.map(rc => (
                  <Link
                    key={rc.slug}
                    href={`/${rc.slug}-${service.slug}`}
                    style={{
                      background: '#fff', border: '1px solid var(--border)',
                      borderRadius: 100, padding: '8px 20px',
                      fontSize: '0.875rem', color: 'var(--dark)', fontWeight: 500,
                      textDecoration: 'none', transition: 'border-color 0.2s',
                    }}
                  >
                    {rc.name}
                  </Link>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ─── FAQ — question-first for AEO extraction ─────────── */}
      <FaqAccordion faqs={faqs} />

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <AnimatedCTA
        heading={`Ready for the Best ${service.name} Near Me in ${city.name}?`}
        text={`Book a free 15-minute call. We'll audit your ${service.name.toLowerCase()} presence across ${city.name} — from ${city.localTerms[0]} to ${city.localTerms[2]} — and show you exactly where competitors are winning.`}
        primaryLabel={`Get a Free ${city.name} Audit →`}
        primaryHref="/contact"
        secondaryLabel="Book a Free Call"
        secondaryHref={BOOKING_URL}
      />
    </>
  )
}
