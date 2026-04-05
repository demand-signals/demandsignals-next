import Link from 'next/link'

const services = [
  { icon: '🌐', title: 'AI-Powered Websites & Apps', href: '/websites-apps', desc: 'WordPress, Next.js, mobile apps, and vibe-coded web apps — all built with AI features, GEO optimization, and continuous improvement from day one.' },
  { icon: '🔮', title: 'LLM & GEO Optimization', href: '/demand-generation/geo-aeo-llm-optimization', desc: 'When someone asks ChatGPT, Perplexity, or Gemini who to hire in your area — your name comes up. We make that happen with GEO, AEO, and llms.txt optimization.' },
  { icon: '✍️', title: 'AI Content & Social', href: '/content-social', desc: 'AI writes your blog posts, social media, and GMB content daily. Replaces your social media manager and content writer at a fraction of the cost. You approve in 10 minutes a week.' },
  { icon: '⭐', title: 'AI Review Auto Responders', href: '/content-social/ai-review-auto-responders', desc: 'AI monitors and responds to every Google review within hours. Professional responses, sentiment tracking, and critical review alerts. Every review handled. Every time.' },
  { icon: '📍', title: 'Local Demand Generation', href: '/demand-generation', desc: 'Full-stack demand gen: local SEO, geo-targeting, GBP management, and automated pipelines. AI monitors, optimizes, and generates leads 24/7.' },
  { icon: '🤖', title: 'AI Agent Swarms', href: '/ai-services/ai-agent-swarms', desc: 'Networks of autonomous AI agents handling marketing operations 24/7 — content, SEO, reviews, outreach. They coordinate through shared data and never take a day off.' },
]

export function ServicesGrid() {
  return (
    <section aria-labelledby="services-heading" style={{ background: 'var(--light)', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={eyebrow}>What We Do</span>
          <h2 id="services-heading" style={{ marginTop: 12 }}>Everything You Need to<br />Dominate Your Market</h2>
          <p style={{ color: 'var(--slate)', maxWidth: 620, margin: '16px auto 0', fontSize: '1.05rem' }}>
            We don&apos;t hand you a site and walk away. We build it, then our AI systems continuously optimize it, produce your content, manage your social media, and respond to your reviews — 24/7, no employees required.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {services.map(s => (
            <article key={s.href} style={card}>
              <div style={{ fontSize: '2.2rem', marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ marginBottom: 10, fontSize: '1.05rem' }}>{s.title}</h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 20, flex: 1 }}>{s.desc}</p>
              <Link href={s.href} style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '0.875rem' }}>Learn more →</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const eyebrow: React.CSSProperties = {
  display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)',
  padding: '4px 14px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '32px 28px',
  border: '1.5px solid #edf0f4', display: 'flex', flexDirection: 'column',
  transition: 'box-shadow 0.22s, border-color 0.22s',
}
