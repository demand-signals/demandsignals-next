import { buildMetadata } from '@/lib/metadata'
import Link from 'next/link'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { CITIES } from '@/lib/cities'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

export const metadata = buildMetadata({
  title:       'AI Marketing Agency — Northern California & Nationwide | Demand Signals',
  description: 'Demand Signals is headquartered in El Dorado County, CA — serving businesses across 5 NorCal counties and clients throughout the USA, Australia, Thailand, and beyond. AI-powered websites, local SEO, and agent swarms.',
  path:        '/locations',
  keywords: [
    'AI marketing Northern California',
    'AI marketing agency El Dorado County',
    'local SEO Sacramento County',
    'marketing agency Placer County',
    'marketing agency Amador County',
    'marketing agency Nevada County',
    'AI marketing agency USA',
    'demand generation Northern California',
  ],
  ogDescription: 'Based in El Dorado County, CA — serving clients across Northern California, the USA, Australia, Thailand, and beyond.',
})

const COUNTIES = [
  {
    slug: 'el-dorado',
    name: 'El Dorado County',
    tagline: 'Our Home County · Gold Country to Lake Tahoe',
    description: 'El Dorado County is our home base — and where our roots run deepest. From the historic Gold Rush towns of the foothills to the world-class shores of Lake Tahoe, we know every neighborhood, competitor, and customer behavior in this market.',
    cities: ['el-dorado-hills', 'cameron-park', 'folsom', 'south-lake-tahoe', 'placerville'],
    featured: true,
    color: '#52C9A0',
  },
  {
    slug: 'sacramento',
    name: 'Sacramento County',
    tagline: "California's Capital Region · Largest Metro Market",
    description: "California's capital region is one of the most competitive local business markets in the state — and one of our strongest. We serve businesses across Sacramento, Folsom, Citrus Heights, and the surrounding suburbs.",
    cities: ['sacramento', 'folsom', 'citrus-heights'],
    featured: false,
    color: '#3B82F6',
  },
  {
    slug: 'placer',
    name: 'Placer County',
    tagline: "NorCal's Fastest-Growing · Affluent Suburbs to Sierra Foothills",
    description: "One of California's fastest-growing counties — from Roseville's booming retail corridors to the affluent enclaves of Granite Bay and the historic charm of Auburn. A high-income market with intense competition and massive opportunity.",
    cities: ['roseville', 'rocklin', 'granite-bay', 'auburn', 'lincoln'],
    featured: false,
    color: '#8B5CF6',
  },
  {
    slug: 'amador',
    name: 'Amador County',
    tagline: 'Gold Rush Wine Country · Boutique Markets, Loyal Customers',
    description: 'Amador County is California\'s undiscovered marketing opportunity — a wine country destination drawing thousands of Bay Area and Sacramento visitors each weekend, with a loyal local base that rewards businesses that show up online.',
    cities: ['jackson', 'sutter-creek'],
    featured: false,
    color: '#DC2626',
  },
  {
    slug: 'nevada',
    name: 'Nevada County',
    tagline: 'Sierra Foothills & Mountain Communities · High-Income, High-Loyalty',
    description: 'Nevada County is a gem — a constellation of educated, high-income communities including Grass Valley, Nevada City, and Truckee. Remote workers, artists, mountain resort visitors, and deeply rooted locals all coexist in one of NorCal\'s most distinctive markets.',
    cities: ['grass-valley', 'nevada-city', 'truckee'],
    featured: false,
    color: '#059669',
  },
]

const GLOBAL_REACH = [
  { flag: '🇺🇸', region: 'United States', note: 'Serving businesses from California to New York — AI systems configured for any US market.' },
  { flag: '🇦🇺', region: 'Australia', note: 'Active clients across Sydney, Melbourne, and regional Australian markets.' },
  { flag: '🇹🇭', region: 'Thailand', note: 'AI marketing for hospitality, tourism, and service businesses throughout Thailand.' },
  { flag: '🌏', region: 'Worldwide', note: 'If you have customers in a market, we can build the AI infrastructure to reach them.' },
]

const locationsFaqs = [
  {
    question: 'Do I need to be in Northern California to work with Demand Signals?',
    answer: 'Not at all. While our roots are in El Dorado County, NorCal, our AI systems serve businesses anywhere in the world. We have active clients across the United States, Australia, Thailand, and beyond. Website development, AI content generation, GEO optimization, and agent swarms work for any market. For local SEO specifically, we configure our systems to your city, not ours.',
  },
  {
    question: 'What makes Demand Signals different for local Northern California businesses?',
    answer: 'We\'re based here. We know the competition in El Dorado Hills. We understand that Folsom businesses compete differently than Placerville businesses. We know Roseville\'s retail landscape and Truckee\'s tourist-driven seasonality. That local intelligence gets baked into every AI system we build — and it\'s something no national agency can replicate from a remote office.',
  },
  {
    question: 'How does local market knowledge improve AI marketing results?',
    answer: 'AI marketing performs dramatically better when trained on local competitive data, seasonal demand patterns, and regional search behavior. For our NorCal clients, we feed real market intelligence into every system — the competitors your customers are comparing you to, the specific keyword patterns in your zip code, and the consumer behaviors unique to your county. The result is a system that outperforms generic national campaigns by a significant margin.',
  },
  {
    question: 'Can you handle multiple locations for businesses with several branches?',
    answer: 'Multi-location businesses are one of our specialties. We build city-specific landing pages, manage separate Google Business Profiles for each location, and run AI content generation tuned to each market. Our agent swarms can handle review responses, social media, and outreach for every location simultaneously — without additional headcount on your end.',
  },
  {
    question: 'Which county or city should I focus on if I serve multiple areas?',
    answer: 'We\'ll tell you based on data, not guesswork. Our free intelligence report analyzes search volume, competition levels, and opportunity gaps across every market you serve — and ranks them by ROI potential. Most multi-area businesses are surprised to find their highest-opportunity market isn\'t the one they\'ve been focusing on.',
  },
]

function CityCard({ city, accentColor }: { city: { slug: string; name: string; county: string; population: string; industries: string[]; description: string }; accentColor: string }) {
  return (
    <Link href={`/locations/${city.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div className="city-card" style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ height: 4, background: accentColor }} />
        <div style={{ padding: '22px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {city.county}
          </span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark)', margin: 0, lineHeight: 1.2 }}>
            {city.name}
          </h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
            👥 {city.population} residents
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
            {city.industries.slice(0, 3).map(ind => (
              <span key={ind} style={{
                background: 'var(--light)', border: '1px solid var(--border)',
                borderRadius: 100, padding: '3px 10px',
                fontSize: '0.72rem', color: 'var(--dark)', fontWeight: 500,
              }}>
                {ind}
              </span>
            ))}
          </div>
          <span style={{ color: '#FF6B2B', fontWeight: 600, fontSize: '0.85rem', marginTop: 4 }}>
            AI Marketing for {city.name} →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function LocationsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Locations', url: 'https://demandsignals.co/locations' },
      ])} />
      <JsonLd data={faqSchema(locationsFaqs)} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <PageHero
        eyebrow="Where We Work"
        title={<>Northern California Roots.<br /><span style={{color:'#FF6B2B'}}>Nationwide Reach.</span></>}
        subtitle="We're headquartered in El Dorado County, deep in the Sierra Nevada foothills — and our AI systems serve clients across the United States, Australia, Thailand, and beyond."
        ctaLabel="Get a Free Audit →"
        ctaHref="/contact"
        callout={<>Wherever your market is, we build the <span style={{color:'#52C9A0'}}>AI infrastructure</span> to own it — local depth, global capability, enterprise-grade systems.</>}
      />

      {/* ── Global Reach ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark-2)', padding: '72px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Global Capability
              </p>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
                AI Marketing That Works Anywhere
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
                Our AI systems are market-agnostic. While Northern California is our backyard, we build demand generation infrastructure for businesses across the globe.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
            {GLOBAL_REACH.map((item) => (
              <StaggerItem key={item.region}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '28px 24px', textAlign: 'center', height: '100%',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{item.flag}</div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>{item.region}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{item.note}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── 5-County Focus Intro ──────────────────────────────────── */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Local Intelligence
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
                5 Counties. Unmatched Local Knowledge.
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.7 }}>
                While we serve clients everywhere, Northern California is our backyard. Five counties surrounding our El Dorado County headquarters — and we know each market intimately.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                {COUNTIES.map(county => (
                  <span key={county.slug} style={{
                    background: '#fff', border: `2px solid ${county.color}20`,
                    borderRadius: 100, padding: '8px 20px',
                    fontSize: '0.875rem', fontWeight: 700, color: county.color,
                  }}>
                    {county.name}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── County Sections ───────────────────────────────────────── */}
      {COUNTIES.map((county, idx) => {
        const countyCities = CITIES.filter(c => county.cities.includes(c.slug))
        const bg = county.featured ? 'var(--dark)' : idx % 2 === 0 ? '#fff' : 'var(--light)'
        const headingColor = county.featured ? '#fff' : 'var(--dark)'
        const bodyColor = county.featured ? 'rgba(255,255,255,0.65)' : 'var(--slate)'
        const eyebrowColor = county.featured ? county.color : county.color

        return (
          <section key={county.slug} style={{ background: bg, padding: '80px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <ScrollReveal direction="up">
                <div style={{ marginBottom: 48 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    <p style={{ color: eyebrowColor, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      {county.tagline}
                    </p>
                    {county.featured && (
                      <span style={{
                        background: 'rgba(82,201,160,0.15)', border: '1px solid rgba(82,201,160,0.3)',
                        borderRadius: 100, padding: '3px 12px',
                        fontSize: '0.7rem', fontWeight: 700, color: '#52C9A0', textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Our Home County
                      </span>
                    )}
                  </div>
                  <h2 style={{ color: headingColor, fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, marginBottom: 14, lineHeight: 1.2 }}>
                    {county.name}
                  </h2>
                  <p style={{ color: bodyColor, fontSize: '1.05rem', maxWidth: 640, lineHeight: 1.75 }}>
                    {county.description}
                  </p>
                </div>
              </ScrollReveal>
              <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 22 }}>
                {countyCities.map(city => (
                  <StaggerItem key={city.slug}>
                    <CityCard city={city} accentColor={county.color} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </section>
        )
      })}

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <FaqAccordion faqs={locationsFaqs} />

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <AnimatedCTA
        heading="Not in Our Area? We'll Come to You."
        text="Our AI systems work for any market. Tell us your city, your industry, and your biggest competitor — and we'll show you exactly how to dominate your local search results."
        primaryLabel="Start the Conversation →"
        primaryHref="/contact"
        secondaryLabel="View All Services"
        secondaryHref="/websites-apps"
      />
    </>
  )
}
