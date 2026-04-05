import { PageHero } from '@/components/sections/PageHero'
import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:              'GEO & LLM Optimization — Get Cited by ChatGPT, Gemini & Perplexity',
  description:        'Optimize your business to appear in AI-generated answers across ChatGPT, Gemini, Perplexity, and every AI assistant your customers use. Generative Engine Optimization for local businesses in Northern California.',
  path:               '/ai-agents/geo-llm',
  keywords:           [
    'GEO optimization Northern California',
    'generative engine optimization Sacramento',
    'LLM optimization local business',
    'ChatGPT citation optimization',
    'AI visibility El Dorado County',
    'answer engine optimization',
    'AI search optimization agency',
  ],
  ogDescription:      'When someone asks ChatGPT who to hire — your name comes up. Generative Engine Optimization for local businesses.',
  twitterTitle:       'GEO & LLM Optimization for Local Business',
  twitterDescription: '90% of businesses are invisible to AI assistants. We change that with GEO and LLM optimization.',
})

const layers = [
  {
    label: 'SEO',
    title: 'Traditional Search Rankings',
    description:
      'Foundational optimization for Google and Bing — keywords, technical health, backlinks, and on-page content. Still essential, now just the floor.',
  },
  {
    label: 'GEO',
    title: 'Generative Engine Optimization',
    description:
      'Structuring your content, entities, and authority signals so AI models cite you when generating answers about your category or location.',
  },
  {
    label: 'AEO',
    title: 'Answer Engine Optimization',
    description:
      'Winning featured snippets, voice search answers, and the zero-click positions that put your name at the top before anyone clicks anything.',
  },
]

const services = [
  {
    title: 'Entity Optimization',
    description: 'Your business exists as a structured entity in knowledge graphs. We define, link, and strengthen it across every platform AI models trust.',
  },
  {
    title: 'Schema Markup',
    description: 'Structured data signals tell AI crawlers exactly what your business is, what it offers, and why it should be recommended. We implement it comprehensively.',
  },
  {
    title: 'Citation Building',
    description: 'AI models trust what authoritative sources say about you. We build and manage citations across the directories, publications, and databases that matter.',
  },
  {
    title: 'AI-Friendly Content Structure',
    description: 'Content written to answer questions directly — the format AI assistants prefer when pulling responses for their users.',
  },
  {
    title: 'LLM.txt Implementation',
    description: "The emerging standard that tells AI crawlers how to interpret your site. We're among the first agencies implementing this — giving our clients an early-mover advantage.",
  },
]

export default function GeoLlmPage() {
  return (
    <>
      <JsonLd
        data={serviceSchema(
          'GEO & LLM Optimization',
          'Optimize your business to appear in AI-generated answers across ChatGPT, Gemini, Perplexity, and every AI assistant your customers use.',
          'https://demandsignals.co/ai-agents/geo-llm',
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'AI Agents', url: 'https://demandsignals.co/ai-agents' },
          { name: 'GEO & LLM Optimization', url: 'https://demandsignals.co/ai-agents/geo-llm' },
        ])}
      />
      <PageHero
        eyebrow="GEO & LLM Optimization"
        title={
          <>
            When Someone Asks ChatGPT Who to Hire —{' '}
            <span style={{color:'#52C9A0'}}>Your Name</span>{' '}
            <span style={{color:'#FF6B2B'}}>Comes Up.</span>
          </>
        }
        subtitle="We optimize your business to appear in AI-generated answers across ChatGPT, Gemini, Perplexity, and every AI assistant your customers use."
        ctaLabel="Run My AI Visibility Audit"
        ctaHref="/contact"
        callout={<><span style={{color:'#52C9A0'}}>90% of businesses</span> are invisible to AI assistants. When a potential customer asks an AI who to call, they never come up. We change that.</>}
      />

      {/* Three Layers */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            The Full Picture
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 620 }}>
            The Three Layers of Modern Search
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 540, marginBottom: 56, lineHeight: 1.7 }}>
            Search has changed permanently. Ranking on Google is no longer enough. We optimize across all three layers so you're visible wherever your customers look.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {layers.map((layer) => (
              <div
                key={layer.label}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(82,201,160,0.1)',
                  border: '1px solid rgba(82,201,160,0.25)',
                  borderRadius: 8,
                  padding: '4px 12px',
                  marginBottom: 16,
                }}>
                  <span style={{ color: 'var(--teal)', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.06em' }}>{layer.label}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>{layer.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem' }}>{layer.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Our Services
          </p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 16, maxWidth: 520 }}>
            What We Do
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 520, marginBottom: 56, lineHeight: 1.7 }}>
            Five interconnected optimization layers that build your AI presence from the ground up — and compound over time.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {services.map((svc) => (
              <div
                key={svc.title}
                style={{
                  background: 'var(--light)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 32px',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>{svc.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem' }}>{svc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
            Find out if AI can see you.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 36 }}>
            Our AI Visibility Audit tests your business across 12 AI assistants and 40+ query types — and shows you exactly where you're missing and what it would take to appear.
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
            Run My AI Visibility Audit →
          </a>
        </div>
      </section>
    </>
  )
}
