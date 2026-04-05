import { buildMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'React & Next.js Web App Development | Demand Signals',
  description: 'Custom React and Next.js web applications built for performance, AI integration, and local search dominance. SSR, TypeScript, and AI-powered features baked in from day one.',
  path:        '/services/nextjs-webapps',
  keywords: [
    'Next.js web app development',
    'React application development Northern California',
    'custom web application Sacramento',
    'Next.js App Router TypeScript',
    'AI web application development',
    'SSR web app El Dorado County',
  ],
})

const WHAT_WE_BUILD = [
  {
    icon: '⚡',
    title: 'Full-Stack Next.js Apps',
    description:
      'Complete web applications using Next.js App Router with TypeScript. Server-side rendering for instant page loads, static generation for SEO, and API routes for your backend logic — all in one framework.',
  },
  {
    icon: '🤖',
    title: 'AI-Integrated Applications',
    description:
      'Web apps with real AI features: intelligent search, AI chatbots trained on your business data, automated content generation, predictive analytics, and LLM-powered workflows built directly into the product.',
  },
  {
    icon: '🗄️',
    title: 'Database-Driven Platforms',
    description:
      'Multi-tenant SaaS platforms, customer portals, and internal dashboards connected to Supabase, PostgreSQL, or Base44. Real-time updates, authentication, and role-based access control.',
  },
  {
    icon: '🔗',
    title: 'API & Integration Layer',
    description:
      'Stripe payments, HubSpot CRM, Twilio SMS, Zapier webhooks, Google APIs — we build the integration layer that connects your web app to your business stack without duct tape.',
  },
  {
    icon: '📊',
    title: 'Client Portals & Dashboards',
    description:
      'Branded customer portals, analytics dashboards, project management tools, and reporting interfaces. Custom-built to your workflow — not shoehorned into someone else\'s product.',
  },
  {
    icon: '🚀',
    title: 'Performance Engineering',
    description:
      'Green Core Web Vitals scores, sub-2-second LCP, near-zero CLS. We care about performance because Google does — and because users bounce when sites are slow.',
  },
]

const TECH_STACK = [
  { label: 'Framework',   value: 'Next.js 15 (App Router), React 19' },
  { label: 'Language',    value: 'TypeScript (strict mode)' },
  { label: 'Styling',     value: 'Tailwind CSS + CSS Modules' },
  { label: 'Database',    value: 'Supabase (PostgreSQL), Base44, Prisma ORM' },
  { label: 'Auth',        value: 'NextAuth.js, Supabase Auth, Clerk' },
  { label: 'AI Layer',    value: 'Claude API (Anthropic), OpenAI, Vercel AI SDK' },
  { label: 'Deployment',  value: 'Vercel Edge Network + CDN' },
  { label: 'Monitoring',  value: 'Sentry, PostHog, Vercel Analytics' },
]

export default function NextjsWebappsPage() {
  return (
    <>
      <JsonLd data={serviceSchema(
        'React & Next.js Web App Development',
        'Custom React and Next.js web applications built for performance, AI integration, and local search dominance.',
        'https://demandsignals.co/services/nextjs-webapps',
      )} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home',     url: 'https://demandsignals.co' },
        { name: 'Services', url: 'https://demandsignals.co/services' },
        { name: 'React / Next.js WebApps', url: 'https://demandsignals.co/services/nextjs-webapps' },
      ])} />

      <PageHero
        eyebrow="React & Next.js Development"
        title={<><span style={{color:'#FF6B2B'}}>Web Apps</span> Built on the<br /><span style={{color:'#52C9A0'}}>Modern AI Stack.</span></>}
        subtitle="Full-stack Next.js applications with AI features, real databases, and performance engineered for Google's Core Web Vitals."
        ctaLabel="Start Your Web App →"
        ctaHref="/contact"
        callout={<>Next.js gives you <span style={{color:'#52C9A0'}}>server rendering, edge deployment, and built-in API routes</span> — so your app ranks in Google and runs at the speed of a native app.</>}
      />

      {/* What We Build */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              What We Build
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Full-Stack Applications That Scale
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {WHAT_WE_BUILD.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 12 }}>
                Technology
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>
                The Stack Behind<br />Every Build
              </h2>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 20 }}>
                We use the same stack the world&apos;s fastest-growing companies use: Next.js on Vercel&apos;s edge network, TypeScript for reliability, and Supabase or Base44 for the database layer.
              </p>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                AI features are built in from day one using Anthropic&apos;s Claude API and the Vercel AI SDK — not bolted on later as an afterthought.
              </p>
            </div>
            <div style={{ background: 'var(--light)', borderRadius: 20, padding: '36px' }}>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
              <div style={{ display: 'grid', gap: 0 }}>
                {TECH_STACK.map((row) => (
                  <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #e8ecf0' }}>
                    <strong style={{ color: 'var(--slate)', minWidth: 110, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                    <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Feature Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              AI-First Development
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              We don&apos;t add AI features. We build AI-native apps.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              There&apos;s a difference between an app that has a chatbot widget and an application where AI is woven into the core workflow. We build the latter — intelligent search, LLM-powered automation, predictive recommendations, and autonomous content pipelines — using the Anthropic Claude API, the Vercel AI SDK, and streaming UI patterns that feel instant to users.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Build Something Real?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Tell us what you&apos;re building and we&apos;ll scope it — architecture, timeline, and a realistic budget. Usually within 48 hours.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              Start My Web App →
            </a>
            <a href="/portfolio" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              See Portfolio
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
