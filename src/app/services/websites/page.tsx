import { buildMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'AI-Powered Websites & Web Apps for Local Business | Demand Signals',
  description: 'Fast, AI-optimized websites built to rank in Google, get cited by ChatGPT and Gemini, and convert visitors into customers. Serving El Dorado County, Sacramento, and Northern California.',
  path:        '/services/websites',
  keywords: [
    'AI website design Northern California',
    'Next.js website local business',
    'GEO optimized website',
    'schema markup website',
    'Core Web Vitals optimization',
    'AI-powered web design Sacramento',
    'local business website El Dorado County',
  ],
})

const WHAT_WE_BUILD = [
  {
    icon: '🏢',
    title: 'Business Websites',
    description:
      'Multi-page marketing sites built on Next.js with schema markup, Core Web Vitals optimization, and a GEO-first content architecture that earns rankings in Google and citations in AI search.',
  },
  {
    icon: '⚙️',
    title: 'Web Apps & Portals',
    description:
      'Custom client portals, booking systems, dashboards, and internal tools. Functional, fast applications built on React that solve real business problems and integrate with your existing stack.',
  },
  {
    icon: '📍',
    title: 'Longtail & Geo Pages',
    description:
      'City and service-specific landing pages at scale — each unique, schema-marked, and indexed. The engine behind local search dominance across multiple service areas.',
  },
  {
    icon: '🔄',
    title: 'Site Migrations',
    description:
      'Moving from Wix, Squarespace, or a legacy platform? We migrate your content, preserve your SEO equity with 301 redirects, and launch you on a faster, cleaner stack.',
  },
  {
    icon: '🎨',
    title: 'Design Systems',
    description:
      'Locked brand systems — color tokens, typography, component libraries — so every page you add looks intentional, not assembled randomly.',
  },
  {
    icon: '🔧',
    title: 'Ongoing Development',
    description:
      'Fractional web development for businesses that need ongoing site work without a full-time developer on payroll. Monthly retainers or project-based.',
  },
]

const WHY_WE_WIN = [
  {
    label: 'Built for GEO & LLM Citations',
    detail: 'Every page is structured so AI assistants like ChatGPT, Perplexity, and Gemini can read, understand, and cite your business in answers.',
  },
  {
    label: 'Core Web Vitals Optimized',
    detail: 'We target green scores on LCP, CLS, and INP — the performance signals Google uses to decide who ranks on page one.',
  },
  {
    label: 'Schema Markup Built-In',
    detail: 'LocalBusiness, Service, FAQ, Review, and Article schema are baked into every build — not an afterthought.',
  },
  {
    label: 'Mobile-First Responsive',
    detail: 'Designed for the device your customer is actually using when they search for you — their phone.',
  },
]

const TECH_STACK = [
  { label: 'Frontend',    value: 'Next.js 15 (App Router), React 19, TypeScript' },
  { label: 'Styling',     value: 'Tailwind CSS + CSS Modules' },
  { label: 'WordPress',   value: 'Custom themes, ACF Pro, WP REST API' },
  { label: 'Database',    value: 'Supabase (PostgreSQL), Base44, Prisma ORM' },
  { label: 'Hosting',     value: 'Vercel Edge / Verpex Managed + Cloudflare CDN' },
  { label: 'AI Layer',    value: 'Claude API → automated content pipelines' },
  { label: 'Search',      value: 'schema.org markup, llms.txt, XML sitemaps' },
  { label: 'Analytics',   value: 'GA4 + Google Search Console + PostHog' },
]

export default function WebsitesPage() {
  return (
    <>
      <JsonLd data={serviceSchema(
        'AI-Powered Websites & Web Apps',
        'Fast, AI-optimized websites and web apps built to rank in Google, get cited by AI assistants, and convert visitors into customers.',
        'https://demandsignals.co/services/websites',
      )} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home',     url: 'https://demandsignals.co' },
        { name: 'Services', url: 'https://demandsignals.co/services' },
        { name: 'Websites & Web Apps', url: 'https://demandsignals.co/services/websites' },
      ])} />

      <PageHero
        eyebrow="Websites & Web Apps"
        title={<>Your Site Should Be<br /><span style={{color:'#52C9A0'}}>Your Best Salesperson.</span></>}
        subtitle="Fast, AI-optimized sites built to rank in Google, get cited by AI, and convert visitors into customers — not glorified brochures that sit there."
        ctaLabel="Build My Site →"
        ctaHref="/contact"
        callout={<>Most local business sites rank on page 4 and convert under 1%. We fix both — with <span style={{color:'#52C9A0'}}>AI-optimized architecture</span> and conversion-engineered design.</>}
      />

      {/* What We Build */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Our Deliverables
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Sites That Do Real Work
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {WHAT_WE_BUILD.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 12 }}>
                Our Stack
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>
                Database-Driven.<br />GEO-First.<br />Agent-Ready.
              </h2>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 20 }}>
                Every site we build is structured for the modern discovery landscape — not just Google&apos;s crawler, but AI systems too. Content lives in a database or CMS, not hardcoded HTML.
              </p>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                Our AI agent system connects to your site post-launch — researching keywords, writing content, and deploying updates on schedule. Your site compounds in authority while you run your business.
              </p>
            </div>
            <div style={{ background: 'var(--light)', borderRadius: 20, padding: '36px' }}>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
              <div style={{ display: 'grid', gap: 0 }}>
                {TECH_STACK.map((row) => (
                  <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #e8ecf0' }}>
                    <strong style={{ color: 'var(--slate)', minWidth: 90, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                    <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Our Sites Win */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Built Different
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Why Our Sites Win
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {WHY_WE_WIN.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
                <span style={{ flexShrink: 0, width: 28, height: 28, background: 'var(--teal)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem', marginTop: 2 }}>✓</span>
                <div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{item.label}</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Difference */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              The Demand Signals Difference
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              Your site doesn&apos;t go stale after launch.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              Every site we build includes automated content updates via our AI agent system. Cyrus researches keyword gaps, Jasper writes SEO-structured service pages and blog posts, and Theo deploys via the WordPress REST API or Next.js CMS — on a schedule, without you lifting a finger. New service pages, fresh blog posts, updated GMB content — deployed automatically. Your site compounds in authority every week while you run your business.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Build a Site That Actually Works?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Tell us about your business and we&apos;ll put together a scope, timeline, and quote — usually within 48 hours.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              Build My Site →
            </a>
            <a href="/portfolio" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              See Portfolio
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
