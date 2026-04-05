import { PageHero } from '@/components/sections/PageHero'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'AI Agent Infrastructure — VPS, Monitoring & Managed Operations',
  description:
    'Enterprise-grade infrastructure for running, monitoring, and scaling AI agent systems — VPS hosting, API management, failover, and cost controls. Built for businesses that cannot afford downtime.',
  keywords: [
    'AI agent infrastructure',
    'managed AI operations Northern California',
    'VPS hosting AI agents',
    'AI monitoring and alerting',
    'agent infrastructure management',
    'API management local business',
    'AI uptime SLA Sacramento',
  ],
  openGraph: {
    title: 'AI Agent Infrastructure — VPS, Monitoring & Managed Operations',
    description:
      'Enterprise-grade infrastructure for AI agent systems — VPS hosting, API management, failover, and 99.9% uptime SLA.',
    url: 'https://demandsignals.co/ai-agents/infrastructure',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Agent Infrastructure — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Infrastructure Management',
    description: 'The engine room behind every demand signal. Infrastructure you never have to think about.',
  },
  alternates: { canonical: 'https://demandsignals.co/ai-agents/infrastructure' },
}

const whatWeRun = [
  {
    title: 'VPS Hosting',
    description:
      'Dedicated virtual servers for your agent workloads — isolated, performant, and sized correctly for your usage patterns from day one.',
  },
  {
    title: 'API Management',
    description:
      'Rate limiting, key rotation, cost controls, and provider redundancy so your agents never go dark because of an API quota or a provider outage.',
  },
  {
    title: 'Agent Monitoring & Alerting',
    description:
      'Real-time visibility into every agent — execution status, error rates, latency, and output quality. Alerts fire before your clients notice anything.',
  },
  {
    title: 'Failover and Redundancy',
    description:
      'Critical agent pipelines run with hot failover configured. If a component fails, traffic routes automatically to a backup — no manual intervention.',
  },
  {
    title: 'Usage Cost Controls',
    description:
      'Hard and soft spend caps on every API integration. You know exactly what your agents cost to run, and you never get a surprise invoice.',
  },
  {
    title: 'Monthly Performance Reports',
    description:
      'A plain-English summary of agent activity, uptime, costs, and outcomes delivered each month — useful for your records and easy to share with stakeholders.',
  },
]

const techStack = [
  { name: 'Python', category: 'Agent logic & orchestration' },
  { name: 'n8n', category: 'Workflow automation engine' },
  { name: 'Supabase', category: 'Database & auth layer' },
  { name: 'Cloudflare', category: 'Edge, DNS & DDoS protection' },
  { name: 'Vercel', category: 'Frontend & serverless functions' },
  { name: 'OpenAI / Claude APIs', category: 'Foundation models' },
]

export default function InfrastructurePage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'AI Agent Infrastructure',
          'Enterprise-grade infrastructure for running, monitoring, and scaling AI agent systems — VPS hosting, API management, failover, and cost controls.',
          'https://demandsignals.co/ai-agents/infrastructure',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'AI Agents', url: 'https://demandsignals.co/ai-agents' },
          { name: 'Agent Infrastructure', url: 'https://demandsignals.co/ai-agents/infrastructure' },
        ])}
      />
      <PageHero
        eyebrow="Agent Infrastructure"
        title={
          <>
            The Engine Room Behind{' '}
            <span style={{ color: '#52C9A0' }}>Every Demand Signal.</span>
          </>
        }
        subtitle="Enterprise-grade infrastructure for running, monitoring, and scaling AI agent systems — built for businesses that can't afford downtime."
        ctaLabel="Talk Infrastructure"
        ctaHref="/contact"
      />

      {/* What We Run */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            What's Managed
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 580 }}>
            What We Run
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 540, marginBottom: 56, lineHeight: 1.7 }}>
            We own every layer of the stack so you never have to think about servers, API keys, or agent health. You focus on the business outcomes — we keep the lights on.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {whatWeRun.map((item) => (
              <div
                key={item.title}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            The Foundation
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 480 }}>
            Tech Stack
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 520, marginBottom: 56, lineHeight: 1.7 }}>
            Proven, production-grade tools — not experiments. Every component has been selected for reliability, cost-efficiency, and how well it composes with the others.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {techStack.map((tech) => (
              <div
                key={tech.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  background: 'var(--light)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '20px 24px',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: '0.97rem' }}>{tech.name}</div>
                  <div style={{ color: 'var(--slate)', fontSize: '0.85rem', marginTop: 2 }}>{tech.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signal strip */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, textAlign: 'center' }}>
          {[
            { value: '99.9%', label: 'target uptime SLA' },
            { value: '<2 min', label: 'mean alert-to-notify time' },
            { value: '100%', label: 'client cost visibility' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 10, fontSize: '0.97rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--light)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
            Infrastructure you don't have to think about.
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Whether you're running two agents or twenty, we design infrastructure that matches your load today and scales without re-architecting when you grow. Let's talk about what you're running.
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
            Talk Infrastructure →
          </a>
        </div>
      </section>
    </>
  )
}
