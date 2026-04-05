import type { Metadata } from 'next';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'AI Content Marketing — Blog, GMB & Social for Local Business',
  description:
    'AI-powered content marketing for local businesses: weekly blog posts, GMB updates, social media, and email newsletters — all written by AI, reviewed by humans, published on schedule in Sacramento and Northern California.',
  keywords: [
    'AI content marketing local business',
    'automated blog posts Northern California',
    'GMB content management Sacramento',
    'AI social media marketing',
    'local business content strategy',
    'El Dorado County content marketing',
    'AI writing agency',
  ],
  openGraph: {
    title: 'AI Content Marketing — Blog, GMB & Social for Local Business',
    description:
      'AI writes your blog posts, GMB updates, social media, and email while you run your business. 20–30 pieces of content per month.',
    url: 'https://demandsignals.co/services/content',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI Content Marketing — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Content Marketing for Local Business',
    description: 'AI writes your content while you run your business. Blog posts, GMB, social, email — published on schedule.',
  },
  alternates: { canonical: 'https://demandsignals.co/services/content' },
};

const WHAT_WE_PRODUCE = [
  { label: 'Weekly blog posts', detail: 'Long-form, keyword-targeted articles that rank in Google and get cited by AI assistants.' },
  { label: 'GMB posts (3 per week)', detail: 'Short, locally-relevant posts that keep your Google Business Profile active and signaling freshness.' },
  { label: 'Social media content', detail: 'Platform-specific posts for Facebook, Instagram, and LinkedIn — written in your brand voice.' },
  { label: 'Email newsletters', detail: 'Monthly emails that keep past customers engaged and drive repeat business.' },
  { label: 'Location & service pages', detail: 'Geo-targeted landing pages that capture searches from specific cities and neighborhoods.' },
];

const PIPELINE_STEPS = [
  {
    step: '01',
    label: 'Research',
    detail: 'Our AI agents pull keyword data, analyze competitor content, and identify the topics with the highest ranking potential for your market.',
  },
  {
    step: '02',
    label: 'Draft',
    detail: 'A specialized writing agent produces a full draft — optimized for the target keyword, structured for featured snippets, and written in your brand voice.',
  },
  {
    step: '03',
    label: 'Human Review',
    detail: 'A Demand Signals strategist reviews every piece for accuracy, tone, and compliance with your specific business context before it moves forward.',
  },
  {
    step: '04',
    label: 'Publish',
    detail: 'Approved content is published directly to your site, GMB profile, or social channels on the scheduled date — no action required from you.',
  },
];

export default function ContentPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'AI Content Marketing',
          'AI-powered content marketing: weekly blog posts, GMB updates, social media, and email newsletters — written by AI, reviewed by humans, published on schedule.',
          'https://demandsignals.co/services/content',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Services', url: 'https://demandsignals.co/services' },
          { name: 'Content Marketing', url: 'https://demandsignals.co/services/content' },
        ])}
      />
      <PageHero
        eyebrow="Content Marketing"
        title={<><span style={{ color: '#52C9A0' }}>AI Writes Your Content</span> While You Run Your Business.</>}
        subtitle="Daily blog posts, social media, GMB updates, and email — all written by AI, all approved before publishing."
        ctaLabel="See Content Samples →"
        ctaHref="/contact"
      />

      {/* What We Produce */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Deliverables
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              What We Produce
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {WHAT_WE_PRODUCE.map((item, i) => (
              <div key={item.label} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '24px 32px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
              }}>
                <span style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
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
                  {i + 1}
                </span>
                <div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{item.label}</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.6, margin: 0 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Content Engine */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              How It Works
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 14 }}>
              The Content Engine
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 620, margin: '0 auto' }}>
              Every piece of content goes through a four-stage pipeline — research, draft, human review, then publish. You get the output of a full content team without managing a full content team.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {PIPELINE_STEPS.map((step) => (
              <div key={step.step} style={{
                background: 'var(--light)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px 28px',
                textAlign: 'center',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 52,
                  height: 52,
                  background: 'var(--teal)',
                  borderRadius: '50%',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  marginBottom: 20,
                }}>
                  {step.step}
                </div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>{step.label}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)',
            borderRadius: 20,
            padding: '48px 52px',
            border: '1px solid rgba(82,201,160,0.2)',
          }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              The Real Advantage
            </p>
            <p style={{ color: '#fff', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>
              Most businesses publish 1-2 pieces of content per month. Our clients publish 20-30.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '0.97rem', margin: 0 }}>
              Search engines and AI assistants reward frequency and depth. The more high-quality, relevant content you have indexed, the more searches you appear in — and the more likely AI tools are to cite you as an authoritative source in your category.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Want to See What We Write?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            We will pull sample content from a business in your category so you can see the quality and depth before you commit to anything.
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
              See Content Samples →
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
              Get a Free Content Audit
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
