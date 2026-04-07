import { buildMetadata } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqSchema } from '@/lib/schema';

const faqs = [
  {
    question: 'What free tools does Demand Signals offer?',
    answer: 'We currently offer a free Demand Audit that scans your online presence across Google, Maps, AI assistants, and social media, plus free Intelligence Reports with custom AI-built competitor analysis and market demand mapping. Two additional tools — Demand Links for AI-powered link intelligence and Dynamic QR for trackable smart QR codes — are in active development and coming soon.',
  },
  {
    question: 'Are these tools really free, or is there a catch?',
    answer: 'They are genuinely free with no credit card required and no upsell walls. We built them to give local businesses real market intelligence so you can see where you stand before spending a dollar. If the data shows you need help, we are here — but the tools deliver value on their own regardless of whether you become a client.',
  },
  {
    question: 'How do your free tools differ from generic SEO audit tools?',
    answer: 'Most free audit tools give you a vanity score and a list of technical issues. Our tools are built specifically for local and regional businesses and go beyond traditional SEO. We audit AI visibility across ChatGPT, Gemini, and Perplexity, analyze your Google Business Profile health, benchmark you against real local competitors, and deliver a prioritized action plan — not just a checklist.',
  },
  {
    question: 'Who are these tools designed for?',
    answer: 'Our tools are designed for local and regional business owners who want data-driven insight into their online visibility without hiring an agency first. Whether you run a dental practice, law firm, restaurant, contractor business, or retail store, these tools analyze the specific signals that determine whether customers find you or your competitor.',
  },
  {
    question: 'How long does it take to get results from a free tool?',
    answer: 'The Demand Audit delivers a full visibility scorecard, competitor benchmark, and prioritized action plan within 48 hours of a short 15-minute intake call. Intelligence Reports follow a similar timeline. Both are prepared by our AI research agents and reviewed by a human strategist before delivery, ensuring every recommendation is actionable and relevant to your specific market.',
  },
];

export const metadata = buildMetadata({
  title:       'Free Tools — Demand Signals',
  description: 'Free AI-powered tools for local businesses — demand audits, intelligence reports, dynamic QR codes, and link intelligence. See where you stand before you spend a dollar.',
  path:        '/tools',
});

const TOOLS = [
  {
    icon: '🔬',
    title: 'Demand Audit',
    description: 'Get a quick snapshot of your business\'s online demand health — search visibility, competitor gaps, and top opportunities — in minutes.',
    href: '/tools/demand-audit',
    badge: 'Free',
    badgeColor: 'var(--teal)',
    available: true,
  },
  {
    icon: '📊',
    title: 'Intelligence Reports',
    description: 'Request a custom AI-built intelligence report — competitor analysis, market demand mapping, SEO/GEO audit, or a strategic 90-day plan.',
    href: '/tools/research-reports',
    badge: 'Free',
    badgeColor: 'var(--teal)',
    available: true,
  },
  {
    icon: '🔗',
    title: 'Demand Links',
    description: 'Build a high-authority, AI-optimized local citation profile. Our agents identify the exact directories and link opportunities for your category.',
    href: '/tools/demand-links',
    badge: 'Coming Soon',
    badgeColor: 'var(--slate)',
    available: false,
  },
  {
    icon: '📱',
    title: 'Dynamic QR',
    description: 'Create smart, trackable QR codes that adapt their destination based on time, location, or campaign. Built for local marketing campaigns.',
    href: '/tools/dynamic-qr',
    badge: 'Coming Soon',
    badgeColor: 'var(--slate)',
    available: false,
  },
];

export default function ToolsPage() {
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
            Free Tools
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            Tools That <span style={{color:'#52C9A0'}}>Actually Tell You Something</span> — <span style={{color:'#FF6B2B'}}>For Free.</span>
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            Free, AI-powered tools built to give you real market intelligence — not generic scores and upsell walls.
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 28 }}>
            {TOOLS.map((tool) => (
              <div key={tool.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                opacity: tool.available ? 1 : 0.75,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{ fontSize: '2rem' }}>{tool.icon}</span>
                  <span style={{
                    background: tool.badgeColor,
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 20,
                  }}>
                    {tool.badge}
                  </span>
                </div>
                <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.2rem', marginBottom: 10 }}>
                  {tool.title}
                </h2>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', flex: 1, marginBottom: 24 }}>
                  {tool.description}
                </p>
                {tool.available ? (
                  <a href={tool.href} style={{
                    display: 'inline-block',
                    background: '#FF6B2B',
                    color: '#fff',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: 100,
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                  }}>
                    Launch Tool →
                  </a>
                ) : (
                  <div style={{
                    background: 'var(--light)',
                    color: 'var(--slate)',
                    fontWeight: 600,
                    padding: '12px 24px',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}>
                    Notify Me When Ready
                  </div>
                )}
              </div>
            ))}
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
      <section style={{ background: 'var(--dark)', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: 14 }}>
            Want Custom Intelligence?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 24 }}>
            Our agents can go deeper than any self-serve tool. Talk to us about a full strategy engagement.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            background: '#FF6B2B',
            color: '#fff',
            fontWeight: 700,
            padding: '13px 28px',
            borderRadius: 100,
            textDecoration: 'none',
          }}>
            Start a Conversation →
          </a>
        </div>
      </section>
    </>
  );
}
