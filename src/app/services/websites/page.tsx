import type { Metadata } from 'next';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'AI-Powered Websites & Web Apps for Local Business',
  description:
    'Fast, AI-optimized websites built to rank in Google, get cited by ChatGPT and Gemini, and convert visitors into customers. Serving El Dorado County, Sacramento, and Northern California.',
  keywords: [
    'AI website design Northern California',
    'Next.js website local business',
    'GEO optimized website',
    'schema markup website',
    'Core Web Vitals optimization',
    'AI-powered web design Sacramento',
    'local business website El Dorado County',
  ],
  openGraph: {
    title: 'AI-Powered Websites & Web Apps for Local Business',
    description:
      'Fast, AI-optimized sites built to rank in Google, get cited by AI assistants, and convert visitors into customers.',
    url: 'https://demandsignals.co/services/websites',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI-Powered Websites — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI-Powered Websites & Web Apps for Local Business',
    description: 'Sites that rank in Google and get cited by AI. Built for local businesses in Northern California.',
  },
  alternates: { canonical: 'https://demandsignals.co/services/websites' },
};

const WHAT_WE_BUILD = [
  {
    icon: '🌐',
    title: 'Business Websites',
    description:
      'Full marketing sites built on Next.js with schema markup, Core Web Vitals optimization, and an SEO architecture that earns rankings — not just pretty pages that sit there.',
  },
  {
    icon: '⚙️',
    title: 'Web Apps & Portals',
    description:
      'Custom client portals, booking systems, dashboards, and internal tools. We build functional, fast applications that solve real business problems and integrate with your existing stack.',
  },
  {
    icon: '🎯',
    title: 'Landing Pages',
    description:
      'High-converting campaign pages and service landing pages built around a single action — whether that\'s a phone call, a form fill, or a booked appointment.',
  },
];

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
];

export default function WebsitesPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'AI-Powered Websites & Web Apps',
          'Fast, AI-optimized websites and web apps built to rank in Google, get cited by AI assistants, and convert visitors into customers.',
          'https://demandsignals.co/services/websites',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Services', url: 'https://demandsignals.co/services' },
          { name: 'Websites & Web Apps', url: 'https://demandsignals.co/services/websites' },
        ])}
      />
      <PageHero
        eyebrow="Websites & Web Apps"
        title={<>Sites That Rank in Google <span style={{ color: '#52C9A0' }}>and Get Cited</span> by AI.</>}
        subtitle="Fast, AI-optimized sites built to convert and dominate local search."
        ctaLabel="Start Your Site →"
        ctaHref="/contact"
      />

      {/* What We Build */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Our Deliverables
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              What We Build
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
            {WHAT_WE_BUILD.map((item) => (
              <div key={item.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.15rem', marginBottom: 12 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Our Sites Win */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Built Different
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Why Our Sites Win
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {WHY_WE_WIN.map((item) => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                background: 'var(--light)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '24px 28px',
              }}>
                <span style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  background: 'var(--teal)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  marginTop: 2,
                }}>✓</span>
                <div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{item.label}</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)',
            borderRadius: 20,
            padding: '48px 52px',
            border: '1px solid rgba(82,201,160,0.2)',
          }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              The Demand Signals Difference
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              Your site doesn&apos;t go stale after launch.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              Every site we build includes automated content updates via our AI agent system — new service pages, fresh blog posts, updated GMB content — deployed on a schedule without you lifting a finger. Your site compounds in authority while you run your business.
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
            <a href="/contact" style={{
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}>
              Start Your Site →
            </a>
            <a href="/tools/research-reports" style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
            }}>
              Get a Free Site Audit
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
