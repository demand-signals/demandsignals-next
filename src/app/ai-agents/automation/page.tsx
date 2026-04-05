import { PageHero } from '@/components/sections/PageHero'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'Workflow Automation — Replace Manual Tasks with AI Pipelines',
  description:
    'We map your manual workflows and replace them with intelligent automation pipelines powered by n8n, Make, and custom AI agents. Stop doing things computers should do. Northern California.',
  keywords: [
    'workflow automation small business',
    'n8n automation agency Northern California',
    'business process automation Sacramento',
    'AI workflow automation El Dorado County',
    'automated lead intake CRM',
    'review request automation',
    'Make automation agency',
  ],
  openGraph: {
    title: 'Workflow Automation — Replace Manual Tasks with AI Pipelines',
    description:
      'Intelligent automation pipelines powered by n8n, Make, and custom AI agents — so your team stops doing things computers should do.',
    url: 'https://demandsignals.co/ai-agents/automation',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Workflow Automation — Demand Signals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workflow Automation for Local Business',
    description: 'Stop doing things computers should do. AI-powered automation pipelines built for local businesses.',
  },
  alternates: { canonical: 'https://demandsignals.co/ai-agents/automation' },
}

const workflows = [
  {
    title: 'Lead Intake & CRM Entry',
    description: 'New leads from any source are automatically captured, enriched, scored, and entered into your CRM — no manual data entry required.',
  },
  {
    title: 'Review Request Sequences',
    description: 'After a job closes, your customers receive a timed, personalized sequence requesting a review on the platforms that matter most.',
  },
  {
    title: 'Social Media Scheduling',
    description: 'Content is written, approved, and queued across channels on a consistent publishing schedule — without someone logging in every day.',
  },
  {
    title: 'Invoice & Follow-Up Reminders',
    description: 'Invoices go out automatically when jobs are marked complete. Overdue reminders fire on a schedule until payment is received.',
  },
  {
    title: 'Report Generation',
    description: 'Weekly and monthly performance reports are compiled from your data sources and delivered to your inbox — no spreadsheet wrangling.',
  },
  {
    title: 'Competitor Monitoring',
    description: 'We track competitor pricing, offers, and content changes on a schedule and alert you when something significant shifts.',
  },
]

const stack = [
  { name: 'n8n', note: 'Self-hosted automation with full control' },
  { name: 'Make (Integromat)', note: 'Complex multi-step workflow scenarios' },
  { name: 'Zapier', note: 'Fast integration for standard tools' },
  { name: 'Custom Python Agents', note: 'When off-the-shelf tools hit their limits' },
]

export default function AutomationPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'Workflow Automation',
          'We map your manual workflows and replace them with intelligent automation pipelines powered by n8n, Make, and custom AI agents.',
          'https://demandsignals.co/ai-agents/automation',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'AI Agents', url: 'https://demandsignals.co/ai-agents' },
          { name: 'Workflow Automation', url: 'https://demandsignals.co/ai-agents/automation' },
        ])}
      />
      <PageHero
        eyebrow="Workflow Automation"
        title={
          <>
            Stop Doing Things{' '}
            <span style={{ color: '#FF6B2B' }}>Computers Should Do.</span>
          </>
        }
        subtitle="We map your manual workflows and replace them with intelligent automation pipelines that run without oversight."
        ctaLabel="Audit My Workflows"
        ctaHref="/contact"
      />

      {/* Workflows We Automate */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Common Automations
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 600 }}>
            Workflows We Automate
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 540, marginBottom: 56, lineHeight: 1.7 }}>
            If your team does the same thing more than twice a week, it belongs in a pipeline — not on someone's to-do list.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {workflows.map((wf) => (
              <div
                key={wf.title}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>
                  {wf.title}
                </h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem' }}>{wf.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Stack */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Tools & Technology
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 480 }}>
            The Stack
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 520, marginBottom: 56, lineHeight: 1.7 }}>
            We pick the right tool for each job — not the one we're most comfortable with. Here's what powers our automation pipelines.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {stack.map((tool) => (
              <div
                key={tool.name}
                style={{
                  background: 'var(--light)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>{tool.name}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.6 }}>{tool.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
            Find out what you should stop doing manually.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Our workflow audit maps your current processes, identifies automation opportunities, and estimates the time and cost savings — before you spend a dollar.
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
            Audit My Workflows →
          </a>
        </div>
      </section>
    </>
  )
}
