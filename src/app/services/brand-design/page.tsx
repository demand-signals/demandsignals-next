import type { Metadata } from 'next';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Brand Identity & Design — Logo, Color & Visual Guidelines',
  description:
    'Logo, color system, typography, and brand guidelines — everything a modern local business needs to look credible, get recognized by customers, and be understood by AI assistants. Serving Northern California.',
  keywords: [
    'brand identity design Northern California',
    'logo design Sacramento',
    'local business branding El Dorado County',
    'brand guidelines design agency',
    'AI brand consistency',
    'Placerville brand design',
    'business identity package',
  ],
  openGraph: {
    title: 'Brand Identity & Design — Logo, Color & Visual Guidelines',
    description:
      'Logo, color system, typography, and brand guidelines — everything a local business needs to look like the market leader.',
    url: 'https://demandsignals.co/services/brand-design',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Brand Identity & Design — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brand Identity & Design for Local Business',
    description: 'A brand that makes you look like the market leader. Logo, color, typography, and guidelines in under 3 weeks.',
  },
  alternates: { canonical: 'https://demandsignals.co/services/brand-design' },
};

const DELIVERABLES = [
  { label: 'Logo Suite', detail: 'Primary logo, horizontal lockup, and standalone icon — delivered in SVG, PNG, and PDF for every use case from web to print.' },
  { label: 'Color Palette with Hex Codes', detail: 'A curated set of primary, secondary, and neutral colors with exact hex, RGB, and CMYK values, plus usage rules for each.' },
  { label: 'Typography System', detail: 'Paired heading and body typefaces with a full size scale, weight hierarchy, and line-height specifications ready for web and print.' },
  { label: 'Business Card & Letterhead', detail: 'Print-ready templates designed to the spec of your new brand — professional collateral that makes the right first impression.' },
  { label: 'Social Media Templates', detail: 'Editable Canva or Figma templates for profile images, cover art, and post formats across your active platforms.' },
  { label: 'Brand Guidelines PDF', detail: 'A complete reference document covering logo usage rules, color application, typography, do\'s and don\'ts — so every vendor and team member stays on brand.' },
];

const WHY_BRAND_FOR_AI = [
  {
    heading: 'Consistent NAP and Entity Recognition',
    body: 'AI assistants build their understanding of a business from structured data scattered across the web. When your business name, logo, and descriptors appear consistently everywhere — your site, GMB, social profiles, directories — AI models learn to recognize you as a coherent entity worth citing.',
  },
  {
    heading: 'Schema Markup Reinforces Brand Identity',
    body: 'We pair your brand system with properly structured Organization and LocalBusiness schema markup, giving AI crawlers explicit machine-readable signals about who you are, what you do, and where you operate.',
  },
  {
    heading: 'Brand Credibility Drives Click-Through',
    body: 'When an AI assistant cites your business and a prospect clicks through to your site, what they see in the first three seconds determines whether they trust you or leave. A professional brand converts that AI-driven traffic into calls and appointments.',
  },
];

export default function BrandDesignPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'Brand Identity & Design',
          'Logo, color system, typography, and visual brand guidelines — everything a modern business needs to look credible and get recognized by customers and AI alike.',
          'https://demandsignals.co/services/brand-design',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Services', url: 'https://demandsignals.co/services' },
          { name: 'Brand Identity & Design', url: 'https://demandsignals.co/services/brand-design' },
        ])}
      />
      <PageHero
        eyebrow="Brand Identity & Design"
        title={<>A Brand That Makes You Look Like <span style={{ color: '#52C9A0' }}>The Market Leader</span> You Are.</>}
        subtitle="Logo, color system, typography, and visual guidelines — everything a modern business needs to look credible and consistent."
        ctaLabel="Start My Brand →"
        ctaHref="/contact"
      />

      {/* Brand Deliverables */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Everything You Get
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Brand Deliverables
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {DELIVERABLES.map((item) => (
              <div key={item.label} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
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
                  fontSize: '0.85rem',
                  marginTop: 2,
                }}>
                  ✓
                </span>
                <div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{item.label}</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Brand Matters for AI Search */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              The Bigger Picture
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 14 }}>
              Why Brand Matters for AI Search
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 580, margin: '0 auto' }}>
              In the age of AI assistants and generative search, brand consistency is not just a design preference — it is a signal that determines whether AI tools recognize and recommend your business.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {WHY_BRAND_FOR_AI.map((item) => (
              <div key={item.heading} style={{
                background: 'var(--light)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 36px',
              }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>{item.heading}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)',
            borderRadius: 20,
            padding: '48px 52px',
            border: '1px solid rgba(82,201,160,0.2)',
          }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              Our Process
            </p>
            <p style={{ color: '#fff', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>
              Discovery call. Concept presentation. Revisions. Final delivery. All in under 3 weeks.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '0.97rem', margin: 0 }}>
              We start with a structured brand discovery session to understand your market position, your ideal customer, and the impression you want to make. Then we present two distinct creative directions — you choose the one that fits, we refine it, and we hand off a complete brand package you can use everywhere, immediately.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Look Like the Leader You Are?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Tell us about your business and where you want to take it. We will send over a proposal within 48 hours.
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
              Start My Brand →
            </a>
            <a href="/portfolio" style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
            }}>
              See Our Portfolio
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
