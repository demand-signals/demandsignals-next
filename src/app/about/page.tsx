import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Demand Signals',
};

export default function AboutPage() {
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
            Who We Are
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            About Demand Signals
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            We're an AI-first demand generation agency based in Northern California — built to help local and regional businesses compete at a national level using automation, AI agents, and real market data.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, marginBottom: 56 }}>
            {[
              {
                icon: '🤖',
                title: 'AI-First by Design',
                body: 'We don\'t bolt AI onto old methods. Every system we build starts with intelligence — AI agents that research, write, optimize, and report so your business moves faster than your competitors.',
              },
              {
                icon: '📍',
                title: 'Northern California Roots',
                body: 'Based in the Sierra Nevada foothills, we serve clients across the US and Australia. We know local markets and understand what it takes for regional businesses to punch above their weight.',
              },
              {
                icon: '📊',
                title: 'Data Before Dollars',
                body: 'We believe you should know where you stand before you spend anything. That\'s why we offer free intelligence reports — so every engagement starts with real insight, not guesswork.',
              },
            ].map((card) => (
              <div key={card.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '32px 28px',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{card.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{card.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{card.body}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 44px' }}>
            <h2 style={{ color: 'var(--dark)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>
              Our Agents Are Our Team
            </h2>
            <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 16 }}>
              Demand Signals runs on a hybrid model — a lean human team directing a farm of specialized AI agents. Research agents. Content agents. SEO agents. Voice agents. Workflow automation agents. Each one is purpose-built and fine-tuned for a specific task.
            </p>
            <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 16 }}>
              This architecture lets us deliver enterprise-grade output at small business pricing. We're not a traditional agency with junior copywriters billing hours — we're an intelligence operation that runs 24/7.
            </p>
            <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              Every engagement gets a dedicated human strategist who oversees the agents, reviews outputs, and ensures everything we deliver actually moves the needle for your business.
            </p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to See What We Can Do?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Start with a free intelligence report or book a 30-minute strategy call.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/tools/research-reports" style={{
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}>
              Get a Free Report →
            </a>
            <a href="/contact" style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
            }}>
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
