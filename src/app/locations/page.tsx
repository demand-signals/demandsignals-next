import Image from 'next/image'
import { buildMetadata } from '@/lib/metadata'
import Link from 'next/link'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { CountySelector } from '@/components/sections/CountySelector'
import { getCountiesWithCities } from '@/lib/counties'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

export const metadata = buildMetadata({
  title:       'AI Marketing Agency — Northern California & Nationwide | Demand Signals',
  description: 'AI marketing agency in El Dorado County, CA serving 5 NorCal counties and clients across the USA, Australia, Thailand, and beyond.',
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

/* ── County data from shared module ────────────────────────── */
const COUNTIES_WITH_CITIES = getCountiesWithCities()

const GLOBAL_REGIONS = [
  { flag: 'https://flagcdn.com/w160/us.png', region: 'United States', markets: 'California, Texas, Florida, New York, and 46 more states', note: 'Our AI systems are market-agnostic — configured for any US city, industry, and competitive landscape.' },
  { flag: 'https://flagcdn.com/w160/au.png', region: 'Australia', markets: 'Sydney, Melbourne, Brisbane, Perth', note: 'Active clients across Australian metros and regional markets. AI content and SEO tuned for AU search behavior.' },
  { flag: 'https://flagcdn.com/w160/th.png', region: 'Thailand', markets: 'Bangkok, Chiang Mai, Phuket, Pattaya', note: 'AI marketing for hospitality, tourism, and service businesses throughout Thailand.' },
  { flag: '🌏', emoji: true, region: 'Global', markets: 'Anywhere your customers are', note: 'If you have a market, we build the AI infrastructure to dominate it — language, search engine, and platform agnostic.' },
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

const SERVICES = [
  { icon: '🌐', title: 'AI-Powered Websites', desc: 'Fast, modern sites built to rank in Google and appear in AI search results. Local schema, city-specific pages, Core Web Vitals optimized.', href: '/websites-apps' },
  { icon: '📍', title: 'Local SEO & Google Maps', desc: 'GBP management, citation building, on-page SEO targeting your city\'s highest-intent searches. We own the Map Pack.', href: '/demand-generation/local-seo' },
  { icon: '🔍', title: 'GEO & LLM Optimization', desc: 'Get cited by ChatGPT, Gemini, and Perplexity when locals ask for recommendations. Structured data, entity signals, llms.txt.', href: '/demand-generation/geo-aeo-llm-optimization' },
  { icon: '✍️', title: 'AI Content & Social', desc: 'City-specific blog posts, social media automation, and review responses published on a consistent schedule.', href: '/content-social/ai-content-generation' },
  { icon: '🤖', title: 'AI Agent Swarms', desc: 'Networks of AI agents handling content, reviews, outreach, and analytics — running 24/7 without a team.', href: '/ai-services/ai-agent-swarms' },
  { icon: '📧', title: 'AI Outreach & Lead Gen', desc: 'Automated prospecting that researches local leads, crafts personalized messages, and routes replies to your inbox.', href: '/ai-services/ai-automated-outreach' },
]

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
        title={<>Northern California Roots.<br /><span style={{color:'#FF6B2B'}}>Global Reach.</span></>}
        subtitle="Headquartered in El Dorado County, deep in California's Gold Country — with AI systems serving clients across the United States, Australia, Thailand, and beyond."
        ctaLabel="Get a Free Audit →"
        ctaHref="/contact"
        callout={<>Our roots are in Northern California. Our reach is <span style={{color:'#52C9A0'}}>worldwide</span>. Wherever your customers search, we build the AI infrastructure to make sure they find you.</>}
      />

      {/* ── Proof Stats ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '40px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <StaggerContainer style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {[
            { value: '5', label: 'NorCal Counties' },
            { value: '23', label: 'City Markets' },
            { value: '4', label: 'Countries Served' },
            { value: '24/7', label: 'AI Systems Running' },
          ].map((p) => (
            <StaggerItem key={p.label}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#52C9A0', lineHeight: 1 }}>{p.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: 6 }}>{p.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ── Global Reach ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--dark-2)', padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Global Capability
              </p>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
                AI Marketing That Works <span style={{color:'#FF6B2B'}}>Anywhere</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                While Northern California is our backyard, our AI systems are market-agnostic. We build demand generation infrastructure for businesses across the globe — same systems, same results, any geography.
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {GLOBAL_REGIONS.map((item) => (
              <StaggerItem key={item.region}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '32px 28px', height: '100%',
                }}>
                  <div style={{ height: 56, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    {'emoji' in item && item.emoji
                      ? <div style={{ fontSize: '3rem', lineHeight: 1 }}>{item.flag}</div>
                      : <Image src={item.flag} alt={`${item.region} flag`} width={80} height={53} style={{ borderRadius: 4, objectFit: 'contain' }} />
                    }
                  </div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>{item.region}</h3>
                  <p style={{ color: 'var(--teal)', fontSize: '0.78rem', fontWeight: 600, marginBottom: 12 }}>{item.markets}</p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{item.note}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── County Selector Hub ──────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 52, maxWidth: 1200, margin: '0 auto 52px' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Our Home Territory
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
              5 Counties. <span style={{color:'#FF6B2B'}}>23 City Markets.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: 640, margin: '0 auto', lineHeight: 1.7 }}>
              We serve clients everywhere — but Northern California is where we live, work, and know every competitor by name. Select a county below to explore the cities we serve.
            </p>
          </div>
        </ScrollReveal>
        <CountySelector counties={COUNTIES_WITH_CITIES} />
      </section>

      {/* ── Services Summary ─────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                What We Deliver In Every Market
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, marginBottom: 16 }}>
                Full-Stack AI Marketing — <span style={{color:'#FF6B2B'}}>Anywhere</span>
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Every city page links to the full suite of AI-powered services we deliver. Here is what a typical engagement includes:
              </p>
            </div>
          </ScrollReveal>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {SERVICES.map(svc => (
              <StaggerItem key={svc.title}>
                <Link href={svc.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 16,
                    padding: '28px 24px', height: '100%', transition: 'transform 0.2s',
                  }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>{svc.icon}</div>
                    <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 8 }}>{svc.title}</h3>
                    <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{svc.desc}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

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
