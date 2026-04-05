import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  title:       'Our Team — The People & AI Behind Demand Signals',
  description: 'Meet the team behind Demand Signals — 30 years of web development and marketing experience, powered by AI agent systems that run 24/7.',
  path:        '/about/team',
})

export default function TeamPage() {
  return (
    <>
      <section style={{ background: 'var(--dark)', paddingTop: 120, paddingBottom: 72, textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            Our Team
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            <span style={{ color: '#52C9A0' }}>Humans + AI.</span>{' '}
            <span style={{ color: '#FF6B2B' }}>Working Together.</span>
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            30 years of web development and marketing experience — amplified by AI systems that handle the repetitive work so we can focus on strategy, relationships, and results.
          </p>
        </div>
      </section>

      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Founder */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', border: '1px solid var(--border)', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #52C9A0, #4fa894)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', flexShrink: 0 }}>
                👤
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 style={{ color: 'var(--dark)', fontWeight: 800, fontSize: '1.5rem', marginBottom: 4 }}>Hunter</h2>
                <p style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Managing Director</p>
                <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem' }}>
                  30-year veteran in web development and digital marketing. Has shipped client projects across every industry — from gun ranges to law firms to MMA gyms in Thailand. Leads strategy, closes deals, and oversees every AI system Demand Signals deploys. Based in Northern California, serving clients across the USA, Thailand, Australia and beyond.
                </p>
              </div>
            </div>
          </div>

          {/* AI Team */}
          <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 56 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              The AI Team
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
              AI Systems That Run 24/7
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 560, margin: '16px auto 0' }}>
              Our domain loop architecture replaces traditional marketing roles with AI systems that monitor, reason, act, and improve — continuously and autonomously.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {[
              { icon: '🔍', name: 'Website Intelligence Loop', role: 'Search & AI Visibility', desc: 'Monitors rankings daily, identifies opportunities, rewrites underperforming pages, and maintains schema and llms.txt.' },
              { icon: '✍️', name: 'Content & Social Loop', role: 'Content Generation', desc: 'Writes blog posts, social media, GBP content, and review responses. Plans calendars monthly, executes daily.' },
              { icon: '⭐', name: 'Reputation Loop', role: 'Review Management', desc: 'Monitors reviews across platforms, drafts professional responses, tracks sentiment, and alerts on critical reviews.' },
            ].map((agent) => (
              <div key={agent.name} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{agent.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{agent.name}</h3>
                <p style={{ color: 'var(--teal)', fontSize: '0.82rem', fontWeight: 600, marginBottom: 12 }}>{agent.role}</p>
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Want to Work With Us?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Whether you need a website, an AI system, or a full demand generation overhaul — we ship fast and deliver results.
          </p>
          <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none' }}>
            Start the Conversation →
          </a>
        </div>
      </section>
    </>
  )
}
