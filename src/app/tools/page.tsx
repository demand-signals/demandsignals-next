import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Tools — Demand Signals',
};

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
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            Free Tools
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            Tools That Actually Tell You Something
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            Free, AI-powered tools built to give you real market intelligence — not generic scores and upsell walls.
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
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
