import { buildMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata = buildMetadata({
  title:              'Local Demand Generation — El Dorado County & Sacramento SEO',
  description:        'AI-powered local SEO, GMB management, and hyper-local content that puts your business at the top of Google Maps and local search in El Dorado County, Sacramento, and Northern California.',
  path:               '/services/local-demand',
  keywords:           [
    'local SEO El Dorado County',
    'local demand generation Sacramento',
    'GMB management Northern California',
    'local search optimization Placerville',
    'AI local SEO agency',
    'Folsom SEO agency',
    'El Dorado Hills marketing',
  ],
  ogDescription:      'AI-powered local SEO and GMB management that puts your business at the top of local search in Northern California.',
  twitterTitle:       'Local Demand Generation for El Dorado County & Sacramento',
  twitterDescription: 'AI-powered local SEO, GMB management, and hyper-local content. Be the first name found in your market.',
});

const STACK_ITEMS = [
  {
    icon: '🔍',
    title: 'Longtail Keyword Targeting',
    description:
      'We map every high-intent search query in your geography — not just the obvious head terms, but the hundreds of longtail queries where buyers are actively looking right now.',
  },
  {
    icon: '📍',
    title: 'GMB Optimization & Posting',
    description:
      'Your Google Business Profile is your most visible local asset. We optimize every field, maintain accurate hours and services, and post 3x per week to keep your profile active and signaling relevance to Google.',
  },
  {
    icon: '🔗',
    title: 'Local Citations & NAP Consistency',
    description:
      'We audit and clean your business data across every major directory — Yelp, Apple Maps, Bing, Foursquare, and dozens more — so your name, address, and phone number are identical everywhere.',
  },
  {
    icon: '⭐',
    title: 'Review Generation & Management',
    description:
      'We build automated review request sequences that turn satisfied customers into public social proof — then respond to every review within 24 hours to show Google and prospects that you are engaged.',
  },
];

const STATS = [
  { value: '10×',  label: 'avg lead volume increase' },
  { value: '68%',  label: 'lower cost per lead vs. agencies' },
  { value: '24/7', label: 'always-on automated systems' },
];

export default function LocalDemandPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'Local Demand Generation',
          'AI-powered local SEO, GMB management, and hyper-local content that puts your business at the top of local search in El Dorado County, Sacramento, and Northern California.',
          'https://demandsignals.co/services/local-demand',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Services', url: 'https://demandsignals.co/services' },
          { name: 'Local Demand Generation', url: 'https://demandsignals.co/services/local-demand' },
        ])}
      />
      <PageHero
        eyebrow="Local Demand Generation"
        title={<>Be the <span style={{color:'#FF6B2B'}}>First Name</span> People Find <span style={{color:'#52C9A0'}}>in Your Market.</span></>}
        subtitle="AI-powered local SEO, GMB management, and hyper-local content that puts you on the map — literally."
        ctaLabel="Get Your Market Audit →"
        ctaHref="/contact"
        callout={<><span style={{color:'#52C9A0'}}>46% of all Google searches</span> have local intent. The businesses that own the Map Pack capture that demand. Everyone else pays for ads.</>}
      />

      {/* Local Demand Stack */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              How We Do It
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              The Local Demand Stack
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 28 }}>
            {STACK_ITEMS.map((item) => (
              <div key={item.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px',
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '2rem', flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                <div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            background: 'var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            {STATS.map((stat) => (
              <div key={stat.label} style={{
                background: '#fff',
                padding: '40px 24px',
                textAlign: 'center',
              }}>
                <div style={{ color: 'var(--teal)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1, marginBottom: 10 }}>
                  {stat.value}
                </div>
                <div style={{ color: 'var(--slate)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof Statement */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)',
            borderRadius: 20,
            padding: '48px 52px',
            border: '1px solid rgba(82,201,160,0.2)',
          }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              Where We Operate
            </p>
            <p style={{ color: '#fff', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>
              We run local demand generation for businesses across El Dorado County, Sacramento, Placer County, and beyond.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '0.97rem', margin: 0 }}>
              Whether you are a contractor in Folsom, a med-spa in El Dorado Hills, or a law firm in downtown Sacramento — we know your market, your competition, and the exact search queries your customers are typing right now.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            See Exactly Where You Stand in Your Market
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Our free Market Demand Analysis maps your search landscape, reveals where competitors are winning, and identifies your fastest-path-to-revenue keywords.
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
              Get Your Market Audit →
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
