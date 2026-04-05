import type { Metadata } from 'next';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Google My Business Management — Dominate the Local Map Pack',
  description:
    'We manage your Google My Business profile like a full-time employee — posts, photos, reviews, and Q&A every day — so you dominate the local map pack in El Dorado County, Sacramento, and Northern California.',
  keywords: [
    'Google My Business management Northern California',
    'GMB optimization Sacramento',
    'local map pack ranking',
    'Google Business Profile management',
    'El Dorado County GMB',
    'review management local business',
    'local SEO map pack',
  ],
  openGraph: {
    title: 'Google My Business Management — Dominate the Local Map Pack',
    description:
      'We manage your GMB profile like a full-time employee — posts, photos, reviews, Q&A — so you own the map pack every day.',
    url: 'https://demandsignals.co/services/gmb',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Google My Business Management — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Google My Business Management for Local Business',
    description: 'Own the map pack. Every search. Every day. AI-managed GMB for Northern California businesses.',
  },
  alternates: { canonical: 'https://demandsignals.co/services/gmb' },
};

const WHAT_WE_MANAGE = [
  {
    label: 'Profile Optimization',
    detail: 'Every field — categories, services, attributes, description, and photos — optimized to match how Google ranks local businesses.',
  },
  {
    label: 'Weekly Posts',
    detail: 'Three keyword-rich GMB posts per week to keep your profile active and signal relevance to Google for your top service terms.',
  },
  {
    label: 'Photo Updates',
    detail: 'Fresh photos uploaded monthly — interior, exterior, team, products, and services — to build visual trust with prospective customers.',
  },
  {
    label: 'Review Responses (Within 24h)',
    detail: 'Every review — positive and negative — gets a thoughtful, on-brand response within 24 hours. Google rewards engagement. Customers notice.',
  },
  {
    label: 'Q&A Management',
    detail: 'We monitor and answer questions on your profile before a competitor does, and pre-populate answers to the questions customers ask most.',
  },
  {
    label: 'Spam Fighting',
    detail: 'We monitor for fake competitor reviews and spam listings that hijack your map pack position and flag them for removal through proper channels.',
  },
];

export default function GmbPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'Google My Business Management',
          'We manage your GMB profile like a full-time employee — posts, photos, reviews, and Q&A — so you dominate the local map pack every day.',
          'https://demandsignals.co/services/gmb',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Services', url: 'https://demandsignals.co/services' },
          { name: 'Google My Business', url: 'https://demandsignals.co/services/gmb' },
        ])}
      />
      <PageHero
        eyebrow="Google My Business"
        title={<>Own the Map Pack. <span style={{ color: '#52C9A0' }}>Every Search. Every Day.</span></>}
        subtitle="We manage your GMB profile like a full-time employee — posts, photos, reviews, and Q&A — without you touching it."
        ctaLabel="Audit My GMB →"
        ctaHref="/contact"
      />

      {/* What We Manage */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Full-Service Management
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              What We Manage
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {WHAT_WE_MANAGE.map((item) => (
              <div key={item.label} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '28px 32px',
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

      {/* Why GMB Matters */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
            <div style={{
              background: 'var(--light)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '36px 32px',
              textAlign: 'center',
            }}>
              <div style={{ color: 'var(--teal)', fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 12 }}>
                46%
              </div>
              <p style={{ color: 'var(--dark)', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>
                of all Google searches have local intent — someone looking for a business near them
              </p>
            </div>
            <div style={{
              background: 'var(--light)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '36px 32px',
              textAlign: 'center',
            }}>
              <div style={{ color: 'var(--teal)', fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 12 }}>
                76%
              </div>
              <p style={{ color: 'var(--dark)', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>
                of local searchers visit a business within 24 hours — the map pack is where those decisions get made
              </p>
            </div>
            <div style={{
              background: 'var(--light)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '36px 32px',
              textAlign: 'center',
            }}>
              <div style={{ color: 'var(--teal)', fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: 12 }}>
                0.4
              </div>
              <p style={{ color: 'var(--dark)', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>
                posts per month — the national average. Our clients post 12x per month and it shows in their rankings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)',
            borderRadius: 20,
            padding: '48px 52px',
            border: '1px solid rgba(82,201,160,0.2)',
          }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              Our Track Record
            </p>
            <p style={{ color: '#fff', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>
              GMB profiles we manage average 4.6 stars and post 3x per week — the national average is 0.4 posts per month.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '0.97rem', margin: 0 }}>
              That gap is not an accident. It is what happens when an AI-powered team treats your GMB profile as a living marketing channel instead of a static directory listing.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Find Out How Your GMB Profile Stacks Up
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            We will audit your Google Business Profile and show you exactly what is costing you map pack positions — and how to fix it.
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
              Audit My GMB →
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
              Free Intelligence Report
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
