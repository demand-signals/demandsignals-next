import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
  title:       'Services — Demand Signals',
  description: 'AI-powered marketing services for local businesses — websites, local SEO, GMB management, content marketing, brand identity, AI agents, and more. Serving Northern California.',
  path:        '/services',
});

const SERVICES = [
  {
    icon: '🏢',
    href: '/services/wordpress',
    title: 'WordPress Sites',
    description: 'AI-managed WordPress sites built for local search, GEO citations, and automated lead generation. Custom themes, WooCommerce, ACF Pro — connected to an AI content pipeline.',
    features: ['Custom WordPress themes', 'WooCommerce stores', 'AI content pipelines', 'Managed hosting + CDN'],
  },
  {
    icon: '⚡',
    href: '/services/nextjs-webapps',
    title: 'React / Next.js WebApps',
    description: 'Full-stack web applications on Next.js with AI features baked in. TypeScript, Supabase, edge deployment, and Claude API integrations from day one.',
    features: ['Next.js App Router', 'TypeScript (strict)', 'AI features built-in', 'Vercel edge deployment'],
  },
  {
    icon: '🤖',
    href: '/services/vibe-coded',
    title: 'Vibe Coded WebApps',
    description: 'AI-built web applications shipped fast using Cursor, Claude Code, Lovable, and Base44. Prototype to production in days — not months.',
    features: ['Cursor + Claude Code', 'Base44 backend', 'Rapid iteration', 'Real databases'],
  },
  {
    icon: '📱',
    href: '/services/mobile-apps',
    title: 'iOS & Android Apps',
    description: 'Cross-platform mobile apps with React Native and Expo. AI features, push notifications, offline mode, and App Store publishing — one codebase, both stores.',
    features: ['React Native + Expo', 'AI-powered features', 'Push notifications', 'App Store publishing'],
  },
  {
    icon: '🎨',
    href: '/services/ui-ux-design',
    title: 'UI/UX Design',
    description: 'Figma-based design systems, high-fidelity UI, user research, and AI-assisted prototyping. Brand-consistent design that ships with your product.',
    features: ['Figma design systems', 'Component libraries', 'AI-assisted ideation', 'Dev-ready handoff'],
  },
  {
    icon: '📍',
    href: '/services/local-demand',
    title: 'Local Demand Generation',
    description: 'Full-stack local SEO, Google Business Profile, review systems, and local content strategy — built to dominate your geographic market and appear in AI search.',
    features: ['Local SEO', 'Citation building', 'Review automation', 'GEO / AI visibility'],
  },
  {
    icon: '🔮',
    href: '/ai-agents/geo-llm',
    title: 'GEO & Generative Search',
    description: 'Optimize your business to appear in AI-generated answers from ChatGPT, Perplexity, Gemini, and voice assistants — the new frontier beyond blue links.',
    features: ['AI citation analysis', 'Schema markup', 'AEO strategy', 'Voice search visibility'],
  },
  {
    icon: '✍️',
    href: '/services/content',
    title: 'Content Marketing',
    description: 'GEO-first content built to rank in search and get cited by AI. Blogs, service pages, and social — written by AI agents and reviewed by humans.',
    features: ['AI content pipelines', 'SEO-structured writing', 'Social media', 'Brand storytelling'],
  },
];

export default function ServicesPage() {
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
            What We Do
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            <span style={{color:'#52C9A0'}}>Full-Stack AI Marketing</span> — <span style={{color:'#FF6B2B'}}>Every Channel. Always On.</span>
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            AI-powered services built for local and regional businesses that want to grow faster without hiring a 10-person team.
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
            {SERVICES.map((service) => (
              <a key={service.title} href={service.href} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                textDecoration: 'none',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 16 }}>{service.icon}</div>
                <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, lineHeight: 1.35 }}>
                  {service.title}
                </h2>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, marginBottom: 20, flex: 1 }}>
                  {service.description}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {service.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate)', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--teal)', fontWeight: 700 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Not Sure Where to Start?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Start with a free intelligence report. We'll tell you exactly where your biggest opportunities are — then you decide what to do next.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/tools/research-reports" style={{
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
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
            }}>
              Talk to Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
