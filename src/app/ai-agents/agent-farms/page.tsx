import { PageHero } from '@/components/sections/PageHero'
import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:              'AI Agent Swarms — Replace Roles, Automate Operations 24/7',
  description:        'Deploy custom AI agent swarms that replace your SEO agency, content writers, outreach reps, and analysts — running 24/7 for a fraction of the cost. Serving Northern California businesses.',
  path:               '/ai-agents/agent-farms',
  keywords:           [
    'AI agent swarms local business',
    'AI agents replace marketing team',
    'automated AI agents Northern California',
    'AI agent deployment Sacramento',
    'custom AI agents El Dorado County',
    'AI operations automation',
    'AI role replacement agency',
  ],
  ogDescription:      'Custom AI agent networks that replace expensive roles — researcher, writer, outreach rep, analyst — running 24/7.',
  twitterTitle:       'AI Agent Swarms for Local Business',
  twitterDescription: '10× more leads with one AI system. Deploy your own swarm and replace expensive roles.',
})

const roles = [
  {
    name: 'SEO Research Agent',
    replaces: 'Replaces a $3k/mo SEO agency',
    description:
      'Continuously monitors keyword opportunities, tracks competitor rankings, audits your pages, and surfaces actionable recommendations — every single day.',
  },
  {
    name: 'Content Agent',
    replaces: 'Replaces 2 full-time writers',
    description:
      'Generates, edits, and publishes SEO-optimized blog posts, landing pages, and social copy on a schedule tuned to your audience and industry.',
  },
  {
    name: 'Outreach Agent',
    replaces: 'Replaces an SDR / sales rep',
    description:
      'Researches prospects, crafts hyper-personalized messages, sends sequences across email and LinkedIn, and routes hot replies straight to your inbox.',
  },
  {
    name: 'Analytics Agent',
    replaces: 'Replaces a data analyst',
    description:
      'Pulls data from every channel, spots trends before they become problems, and delivers a plain-English weekly performance report without being asked.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Audit Your Current Roles & Workflows',
    body: 'We map every repetitive, rules-based task your team performs — the work that eats hours but rarely needs human judgment.',
  },
  {
    number: '02',
    title: 'Build and Train Your Agent Network',
    body: 'We design, configure, and test a custom agent farm scoped to your business — no off-the-shelf templates, no shared prompts.',
  },
  {
    number: '03',
    title: 'Monitor, Optimize, Scale',
    body: 'We own the infrastructure. You get weekly reports, monthly reviews, and agents that get smarter as your business grows.',
  },
]

const stats = [
  { value: '10×',  label: 'avg lead volume increase' },
  { value: '68%',  label: 'lower cost per lead vs. agencies' },
  { value: '24/7', label: 'always-on automated systems' },
]

export default function AgentFarmsPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'AI Agent Swarms',
          'Custom networks of AI agents that replace expensive roles — researcher, writer, outreach rep, analyst — running 24/7 for a fraction of the cost.',
          'https://demandsignals.co/ai-agents/agent-farms',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'AI Agents', url: 'https://demandsignals.co/ai-agents' },
          { name: 'AI Agent Swarms', url: 'https://demandsignals.co/ai-agents/agent-farms' },
        ])}
      />
      <PageHero
        eyebrow="AI Agent Swarms"
        title={
          <>
            <span style={{color:'#FF6B2B'}}>10× More Leads.</span>{' '}
            <span style={{color:'#52C9A0'}}>One AI System.</span>
          </>
        }
        subtitle="We deploy custom networks of AI agents that replace specific expensive roles — researcher, writer, outreach rep, analyst."
        ctaLabel="Design My Agent Swarm"
        ctaHref="/contact"
        callout={<>The average marketing agency costs <span style={{color:'#52C9A0'}}>$5,000–$15,000/month</span> and runs during business hours. Our AI agent swarms cost less and run 24/7.</>}
      />

      {/* What an Agent Swarm Does */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Role Replacement
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 640 }}>
            What an Agent Swarm Does
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.1rem', maxWidth: 560, marginBottom: 56, lineHeight: 1.7 }}>
            Each agent handles a discrete job function end-to-end. Together they form a coordinated team that never sleeps, never calls in sick, and gets cheaper as it scales.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {roles.map((role) => (
              <div
                key={role.name}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <p style={{ color: 'var(--teal)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  {role.replaces}
                </p>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>
                  {role.name}
                </h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.97rem' }}>{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, textAlign: 'center' }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ color: 'var(--slate)', marginTop: 10, fontSize: '1rem', lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Deploy */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            The Process
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: '#fff', marginBottom: 56, maxWidth: 480 }}>
            How We Deploy
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 760 }}>
            {steps.map((step) => (
              <div key={step.number} style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0,
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: 'rgba(82,201,160,0.15)',
                  border: '1px solid rgba(82,201,160,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: 'var(--teal)', fontWeight: 800, fontSize: '0.9rem' }}>{step.number}</span>
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--light)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
            Ready to build your agent farm?
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Tell us which roles you want to replace and we'll design an agent network around your exact workflows — no one-size-fits-all packages.
          </p>
          <a
            href="/contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '15px 36px',
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 100,
              textDecoration: 'none',
            }}
          >
            Design My Agent Swarm →
          </a>
        </div>
      </section>
    </>
  )
}
