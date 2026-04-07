import { buildMetadata } from '@/lib/metadata';
import ProofTable from '@/components/sections/ProofTable';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqSchema } from '@/lib/schema';

const faqs = [
  {
    question: 'What types of businesses has Demand Signals worked with?',
    answer: 'We have worked with businesses across a wide range of industries including veterinary and medical practices, dental offices, law firms, roofing and construction contractors, real estate brokerages, fitness studios, restaurants and craft beverage brands, auto service businesses, retail stores, and education centers. Our AI-powered systems are designed to be industry-agnostic, adapting to the specific competitive landscape and customer behavior of each market.',
  },
  {
    question: 'What kind of results can I expect from working with Demand Signals?',
    answer: 'Results vary by industry and starting point, but our engagements typically focus on measurable outcomes: improved search visibility for high-intent local keywords, increased Google Maps rankings, enhanced AI citation status across ChatGPT, Gemini, and Perplexity, automated lead capture and qualification, and streamlined operations through AI voice and booking systems. Every engagement begins with a baseline audit so progress is tracked against real data.',
  },
  {
    question: 'What services does Demand Signals provide for client projects?',
    answer: 'Our client projects typically combine multiple capabilities depending on the business need. These include AI-optimized website builds, local SEO and Google Business Profile optimization, GEO and LLM optimization for AI citation visibility, AI voice receptionists and booking automation, content strategy and automated publishing, review management and reputation systems, and demand generation campaigns with lead qualification funnels.',
  },
  {
    question: 'Do you work with businesses outside of Northern California?',
    answer: 'Yes. While many of our clients are based in Northern California — particularly the Sacramento metro area, El Dorado County, and the Sierra Foothills — we serve clients across the United States, Thailand, Australia, and beyond. Our AI-powered systems work in any geography, and our strategies are tailored to the specific local market, competitors, and customer behavior of each region we operate in.',
  },
  {
    question: 'How do I get started with Demand Signals?',
    answer: 'The best first step is to book a free strategy call or request a free Demand Audit. The audit gives you a clear picture of your current visibility across Google, Maps, AI assistants, and social media, benchmarked against your local competitors. From there, we build a tailored engagement plan around the highest-impact opportunities. There is no obligation — the audit and action plan are yours to keep regardless of whether you choose to work with us.',
  },
];

export const metadata = buildMetadata({
  title:       'Portfolio — Demand Signals',
  description: 'Client work from Demand Signals — AI-powered websites, local SEO campaigns, agent systems, and demand generation for local businesses across Northern California.',
  path:        '/portfolio',
});

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
      <JsonLd data={faqSchema(faqs)} />
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            Client Work
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            <span style={{color:'#52C9A0'}}>Client Work.</span> <span style={{color:'#FF6B2B'}}>Real Results.</span>
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            Real businesses. Real results. We work across industries in Northern California and beyond — building AI-powered systems that drive measurable demand.
          </p>
        </div>
      </section>

      {/* Proof Table */}
      <ProofTable />

      {/* Client Grid */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
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

      {/* FAQ Section */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FAQ</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {faqs.map(faq => (
              <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>{faq.question}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>{faq.answer}</p>
              </div>
            ))}
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
