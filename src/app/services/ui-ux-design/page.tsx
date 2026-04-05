import { buildMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'UI/UX Design — Figma, Design Systems & AI-Assisted Design | Demand Signals',
  description: 'Brand-consistent UI/UX design built in Figma. Design systems, component libraries, user research, and AI-assisted prototyping that ships with your product.',
  path:        '/services/ui-ux-design',
  keywords: [
    'UI UX design Northern California',
    'Figma design system',
    'web app UI design Sacramento',
    'brand design system',
    'component library design',
    'AI-assisted UX design',
    'user experience design El Dorado County',
  ],
})

const WHAT_WE_DESIGN = [
  {
    icon: '🎨',
    title: 'Design Systems',
    description:
      'A locked design system — color tokens, typography scale, spacing system, component library — that ensures every page you build, every product you ship, looks intentional and consistent.',
  },
  {
    icon: '🖼️',
    title: 'Web & App UI',
    description:
      'High-fidelity Figma designs for marketing sites, web apps, dashboards, and mobile apps. Every component is built with developer handoff in mind — no ambiguity between design and code.',
  },
  {
    icon: '🔬',
    title: 'User Research & Testing',
    description:
      'User interviews, usability testing, heatmap analysis, and A/B test design. We validate that the interface actually works for real humans before development starts.',
  },
  {
    icon: '📐',
    title: 'Wireframing & Prototyping',
    description:
      'Low-fi wireframes to clarify structure, high-fi prototypes to test interactions. Figma prototypes that stakeholders can click through before a line of code is written.',
  },
  {
    icon: '🤖',
    title: 'AI-Assisted Design',
    description:
      'Figma AI and generative tools accelerate ideation and variation exploration. We use AI to generate options fast, then apply design judgment to select and refine what\'s right.',
  },
  {
    icon: '🔧',
    title: 'Developer Handoff',
    description:
      'Figma to code — clean component naming, design tokens exported as CSS variables, auto-layout that maps to flexbox/grid, and annotated specs your developers actually use.',
  },
]

const PROCESS_STEPS = [
  { num: '01', title: 'Discovery', detail: 'Brand audit, competitor review, user persona development, and goal alignment. We define what success looks like before opening Figma.' },
  { num: '02', title: 'Architecture', detail: 'Information architecture, user flow mapping, and content hierarchy. The skeleton of the experience before any visual design.' },
  { num: '03', title: 'Design System', detail: 'Color palette, typography, spacing tokens, and core components. The foundation that makes every subsequent design decision faster and more consistent.' },
  { num: '04', title: 'UI Design', detail: 'High-fidelity screens for all key flows. Desktop, tablet, and mobile breakpoints. Dark mode if needed. Interactive Figma prototypes for stakeholder review.' },
  { num: '05', title: 'Handoff & Build', detail: 'Dev-ready Figma with named components, exported tokens, and annotated interactions. We stay available through development to answer implementation questions.' },
]

export default function UIUXDesignPage() {
  return (
    <>
      <JsonLd data={serviceSchema(
        'UI/UX Design',
        'Brand-consistent UI/UX design in Figma with design systems, component libraries, and AI-assisted prototyping.',
        'https://demandsignals.co/services/ui-ux-design',
      )} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home',     url: 'https://demandsignals.co' },
        { name: 'Services', url: 'https://demandsignals.co/services' },
        { name: 'UI/UX Design', url: 'https://demandsignals.co/services/ui-ux-design' },
      ])} />

      <PageHero
        eyebrow="UI/UX Design"
        title={<>Design That <span style={{color:'#FF6B2B'}}>Converts</span> and<br /><span style={{color:'#52C9A0'}}>Scales.</span></>}
        subtitle="Figma-based design systems and high-fidelity UI that ship with your product — not a year after it."
        ctaLabel="Start a Design Project →"
        ctaHref="/contact"
        callout={<>Good design isn&apos;t decoration — it&apos;s <span style={{color:'#52C9A0'}}>conversion architecture.</span> Every layout decision, every CTA placement, every color choice is made to move users toward the action that matters.</>}
      />

      {/* What We Design */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Our Deliverables
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              What We Design
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {WHAT_WE_DESIGN.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              How We Work
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Our Design Process
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PROCESS_STEPS.map((step) => (
              <div key={step.num} style={{ display: 'flex', gap: 24, background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
                <span style={{ flexShrink: 0, color: 'var(--teal)', fontWeight: 800, fontSize: '1.1rem', minWidth: 36 }}>{step.num}</span>
                <div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{step.title}</h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              AI-Assisted Design
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              Figma AI accelerates ideation. Design judgment selects the winner.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              We use Figma AI and generative design tools to explore 10 layout variations in the time it used to take to create 2. But AI doesn&apos;t have taste — it generates options, we apply the strategic and aesthetic judgment to know which one converts, which one scales, and which one represents your brand accurately. Faster exploration, better final product.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Let&apos;s Design Something Worth Building.
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Tell us about your product or site. We&apos;ll propose a design engagement that fits your scope and budget.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              Start a Design Project →
            </a>
            <a href="/portfolio" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              See Our Work
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
