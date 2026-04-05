import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI & Agents — Demand Signals',
};

const AGENT_SERVICES = [
  {
    icon: '🔍',
    title: 'Research & Intelligence Agents',
    description: 'AI agents that continuously monitor competitors, track keyword movements, scan market demand, and surface opportunities before you have to ask.',
    capabilities: ['Competitor keyword tracking', 'Market demand monitoring', 'SERP change detection', 'Opportunity alerts'],
  },
  {
    icon: '✍️',
    title: 'Content Generation Agents',
    description: 'Trained on your brand voice, your market, and your audience — these agents produce blogs, landing pages, social posts, and email sequences at scale.',
    capabilities: ['Long-form blog content', 'Local landing pages', 'Email sequences', 'Social media content'],
  },
  {
    icon: '📞',
    title: 'AI Voice Agents',
    description: 'Conversational AI that handles inbound calls, qualifies prospects, books appointments, and answers FAQs — with a voice that sounds human and stays on script.',
    capabilities: ['Inbound call handling', 'Lead qualification', 'Appointment booking', 'After-hours coverage'],
  },
  {
    icon: '🔮',
    title: 'GEO & AEO Optimization Agents',
    description: 'Agents that analyze your AI citation profile across ChatGPT, Perplexity, Gemini, and voice platforms — and generate the schema, content, and signals to improve it.',
    capabilities: ['AI citation monitoring', 'Schema generation', 'Voice search optimization', 'Entity reinforcement'],
  },
  {
    icon: '⚙️',
    title: 'Workflow & CRM Agents',
    description: 'Automation agents that connect your tools, route leads, trigger follow-ups, and generate reports — without manual intervention or custom dev work.',
    capabilities: ['Lead routing logic', 'CRM data hygiene', 'Follow-up sequences', 'Pipeline reporting'],
  },
  {
    icon: '📋',
    title: 'Reporting & Analytics Agents',
    description: 'Agents that pull data from multiple sources — Google Search Console, GMB, analytics, CRM — and compile it into clear weekly and monthly intelligence briefs.',
    capabilities: ['Automated weekly reports', 'Rank tracking', 'Conversion attribution', 'Custom dashboards'],
  },
];

export default function AiAgentsPage() {
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
            Our Agent Stack
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            AI & Agents
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            We run a specialized farm of AI agents — each purpose-built for a specific job. Research. Content. Voice. GEO. Automation. Reporting. They work 24/7 so your business doesn't have to stop.
          </p>
        </div>
      </section>

      {/* Intro Banner */}
      <section style={{ background: 'rgba(104,197,173,0.08)', borderTop: '1px solid rgba(104,197,173,0.2)', borderBottom: '1px solid rgba(104,197,173,0.2)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', textAlign: 'center' }}>
          {[
            { number: '6', label: 'Agent Categories' },
            { number: '24/7', label: 'Operation' },
            { number: '48h', label: 'Report Turnaround' },
            { number: '100%', label: 'Human-Reviewed Output' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ color: 'var(--teal)', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1 }}>{stat.number}</div>
              <div style={{ color: 'var(--slate)', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Cards */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
            {AGENT_SERVICES.map((agent) => (
              <div key={agent.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 16 }}>{agent.icon}</div>
                <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, lineHeight: 1.35 }}>
                  {agent.title}
                </h2>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, marginBottom: 20, flex: 1 }}>
                  {agent.description}
                </p>
                <div>
                  <p style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Capabilities
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {agent.capabilities.map((c) => (
                      <li key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate)', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--teal)', fontWeight: 700 }}>✓</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Agents Work */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, marginBottom: 20 }}>
            Agents + Human Strategy = Better Than Either Alone
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.75, marginBottom: 20 }}>
            Every agent we deploy is supervised by a human strategist. Agents do the heavy lifting — research, writing, monitoring, reporting. Humans make the strategic calls, review quality, and ensure everything aligns with your business goals.
          </p>
          <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.75, marginBottom: 32 }}>
            This hybrid model gives you enterprise-grade intelligence and execution capacity at a fraction of the cost of building an in-house team.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            background: '#FF6B2B',
            color: '#fff',
            fontWeight: 700,
            padding: '14px 32px',
            borderRadius: 100,
            textDecoration: 'none',
          }}>
            Talk to Us About Agents →
          </a>
        </div>
      </section>
    </>
  );
}
