import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services — Demand Signals',
};

const SERVICES = [
  {
    icon: '🌐',
    title: 'Website & Web App Development',
    description: 'Fast, conversion-optimized websites and custom web applications built on modern stacks. Every site is built to rank, load fast, and convert visitors into leads.',
    features: ['Next.js / React', 'SEO-ready architecture', 'Mobile-first', 'CMS integration'],
  },
  {
    icon: '📍',
    title: 'Local Demand Generation',
    description: 'Full-stack local SEO, Google Business Profile optimization, review systems, and local content strategy — built to dominate your geographic market.',
    features: ['GMB optimization', 'Local citation building', 'Review automation', 'Rank tracking'],
  },
  {
    icon: '🔮',
    title: 'GEO / LLM Optimization',
    description: 'Optimize your business to appear in AI-generated answers from ChatGPT, Perplexity, Gemini, and voice assistants. The new frontier of search.',
    features: ['AI citation analysis', 'Schema markup', 'AEO strategy', 'Voice search visibility'],
  },
  {
    icon: '🤖',
    title: 'AI Agent Farm',
    description: 'Purpose-built AI agents for your specific workflows — research, content, outreach, intake, reporting. We build, deploy, and maintain the entire agent stack.',
    features: ['Custom agent builds', 'Workflow automation', 'CRM integration', 'Agent monitoring'],
  },
  {
    icon: '📞',
    title: 'AI Voice System',
    description: 'Intelligent voice agents that handle inbound calls, qualify leads, book appointments, and escalate complex issues — 24/7, no hold times.',
    features: ['Inbound call handling', 'Appointment booking', 'Lead qualification', 'After-hours coverage'],
  },
  {
    icon: '⚙️',
    title: 'Workflow Automation',
    description: 'Connect your tools, eliminate manual data entry, and build automated pipelines from lead capture through delivery. We use n8n, Make, and custom integrations.',
    features: ['CRM automation', 'Email sequences', 'Reporting pipelines', 'API integrations'],
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
            Services
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
              <div key={service.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
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
              </div>
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
