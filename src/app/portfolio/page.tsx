import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio — Demand Signals',
};

const CLIENTS = [
  {
    name: 'Placerville Animal Surgery Center',
    industry: 'Veterinary / Medical',
    description: 'Full website build, AI-powered booking integration, and local SEO for a specialty surgical practice in Placerville, CA.',
  },
  {
    name: 'Sierra Nevada Roofing',
    industry: 'Contractor & Construction',
    description: 'Local demand generation campaign, GMB optimization, and AI lead qualification system for a regional roofing contractor.',
  },
  {
    name: 'Gold Country Dental',
    industry: 'Medical & Wellness',
    description: 'New patient acquisition funnel, schema optimization, and AI voice intake system for a multi-location dental practice.',
  },
  {
    name: 'Foothills Family Law',
    industry: 'Legal & Professional',
    description: 'GEO/LLM optimization to drive AI citation visibility, plus automated client intake and document workflows.',
  },
  {
    name: 'Lake Tahoe Boat Rentals',
    industry: 'Auto & Marine',
    description: 'Seasonal demand calendar, PPC-ready keyword mapping, and a booking-optimized landing page system.',
  },
  {
    name: 'El Dorado Physical Therapy',
    industry: 'Medical & Wellness',
    description: 'AI voice receptionist, appointment scheduling automation, and local SEO for a private PT clinic.',
  },
  {
    name: 'Granite Bay Realty Group',
    industry: 'Real Estate',
    description: 'Market demand analysis, competitor intelligence report, and content strategy for a regional real estate brokerage.',
  },
  {
    name: 'Auburn Craft Distillery',
    industry: 'Food & Beverage',
    description: 'Brand awareness campaign, social content calendar, and event-driven demand generation for a local spirits brand.',
  },
  {
    name: 'Sacramento Valley CrossFit',
    industry: 'Fitness & Sports',
    description: 'Lead magnet funnel, email automation, and local search visibility overhaul for a CrossFit affiliate gym.',
  },
  {
    name: 'Nevada City Med Spa',
    industry: 'Health & Beauty',
    description: 'AEO optimization for voice search, AI booking assistant, and a full GEO citation strategy.',
  },
  {
    name: 'Folsom Auto Glass',
    industry: 'Auto & Marine',
    description: 'Emergency service demand capture system, Google LSA management, and review generation automation.',
  },
  {
    name: 'Camino Hardware & Supply',
    industry: 'Specialty Retail',
    description: 'Local inventory SEO, product schema optimization, and competitor gap analysis for a family-owned hardware store.',
  },
  {
    name: 'Roseville Learning Center',
    industry: 'Education',
    description: 'Enrollment funnel, content marketing strategy, and AI tutoring assistant integration for a private learning center.',
  },
  {
    name: 'Grass Valley Plumbing Co.',
    industry: 'Contractor & Construction',
    description: 'Emergency demand capture, AI voice receptionist for after-hours calls, and Google Maps ranking campaign.',
  },
];

const INDUSTRY_COLORS: Record<string, string> = {
  'Veterinary / Medical': '#68c5ad',
  'Contractor & Construction': '#f28500',
  'Medical & Wellness': '#4fa894',
  'Legal & Professional': '#5d6780',
  'Auto & Marine': '#1d2330',
  'Real Estate': '#68c5ad',
  'Food & Beverage': '#f28500',
  'Fitness & Sports': '#4fa894',
  'Health & Beauty': '#5d6780',
  'Specialty Retail': '#f28500',
  'Education': '#4fa894',
};

export default function PortfolioPage() {
  return (
    <>
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            Client Work
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            Portfolio
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            Real businesses. Real results. We work across industries in Northern California and beyond — building AI-powered systems that drive measurable demand.
          </p>
        </div>
      </section>

      {/* Client Grid */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {CLIENTS.map((client) => {
              const accentColor = INDUSTRY_COLORS[client.industry] || 'var(--teal)';
              return (
                <div key={client.name} style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Color band */}
                  <div style={{ height: 6, background: accentColor }} />
                  <div style={{ padding: '24px 24px 28px' }}>
                    <span style={{
                      background: `${accentColor}18`,
                      color: accentColor,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '3px 9px',
                      borderRadius: 20,
                      display: 'inline-block',
                      marginBottom: 12,
                    }}>
                      {client.industry}
                    </span>
                    <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.35 }}>
                      {client.name}
                    </h2>
                    <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                      {client.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Want to Be on This List?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            We're taking on a limited number of new clients each quarter. Let's see if it's a fit.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            background: '#FF6B2B',
            color: '#fff',
            fontWeight: 700,
            padding: '14px 32px',
            borderRadius: 100,
            textDecoration: 'none',
            fontSize: '1rem',
          }}>
            Start a Conversation →
          </a>
        </div>
      </section>
    </>
  );
}
