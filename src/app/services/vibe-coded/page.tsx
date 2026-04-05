import { buildMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'Vibe Coded Web Apps — AI-Built Prototypes to Production | Demand Signals',
  description: 'We ship vibe-coded web apps fast using AI coding tools: Cursor, Claude, Lovable, Base44, and v0. From idea to working product in days, not months.',
  path:        '/services/vibe-coded',
  keywords: [
    'vibe coding web app',
    'AI-generated web application',
    'Cursor AI development',
    'Claude code web app',
    'rapid prototype development',
    'AI app development Northern California',
    'Base44 web app development',
  ],
})

const TOOLS_WE_USE = [
  {
    icon: '🤖',
    title: 'Claude Code + Cursor',
    description:
      'Anthropic\'s Claude Code and Cursor AI handle the heavy lifting of code generation. We prompt, review, and ship — cutting development time by 60–80% without sacrificing quality.',
  },
  {
    icon: '🏗️',
    title: 'Base44 Platform',
    description:
      'For data-driven apps that need a real backend fast, Base44 gives us a managed database, authentication, file storage, and API layer — all without standing up infrastructure.',
  },
  {
    icon: '⚡',
    title: 'Lovable & v0',
    description:
      'UI-first prototyping with Lovable and Vercel\'s v0 lets us ship pixel-perfect component libraries and full page designs in hours. Then we connect them to real data and real logic.',
  },
  {
    icon: '🔄',
    title: 'Rapid Iteration',
    description:
      'Because AI writes the first draft, iteration is cheap. Want a feature changed? We prompt, test, and ship — usually the same day. No sprint planning, no ticket queues.',
  },
  {
    icon: '🗄️',
    title: 'Real Databases, Not Mock Data',
    description:
      'Vibe-coded doesn\'t mean toy app. Every production build uses Supabase, Base44, or PostgreSQL with proper data modeling, migrations, and security policies.',
  },
  {
    icon: '🚀',
    title: 'Prototype to Production',
    description:
      'We take the vibe-coded prototype all the way to production deployment on Vercel — with TypeScript, error handling, monitoring, and a CI/CD pipeline that actually works.',
  },
]

const WHAT_WE_SHIP = [
  { label: 'Internal Tools',      detail: 'CRM dashboards, inventory systems, employee portals, reporting tools' },
  { label: 'Client Portals',      detail: 'Branded customer-facing portals with real-time data and document management' },
  { label: 'Booking & Scheduling', detail: 'Appointment booking systems with SMS/email reminders and calendar sync' },
  { label: 'AI-Powered Tools',    detail: 'Calculators, estimators, recommendation engines, chatbots trained on your data' },
  { label: 'Marketing Apps',      detail: 'Interactive lead gen tools, quizzes, configurators, and audit tools' },
  { label: 'MVP Startups',        detail: 'First version of your SaaS product — fast enough to validate before you over-invest' },
]

export default function VibeCodingPage() {
  return (
    <>
      <JsonLd data={serviceSchema(
        'Vibe Coded Web Applications',
        'AI-built web apps shipped fast using Cursor, Claude Code, Lovable, and Base44. Prototype to production in days.',
        'https://demandsignals.co/services/vibe-coded',
      )} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home',     url: 'https://demandsignals.co' },
        { name: 'Services', url: 'https://demandsignals.co/services' },
        { name: 'Vibe Coded WebApps', url: 'https://demandsignals.co/services/vibe-coded' },
      ])} />

      <PageHero
        eyebrow="Vibe Coded WebApps"
        title={<><span style={{color:'#FF6B2B'}}>AI Builds It.</span><br /><span style={{color:'#52C9A0'}}>We Ship It.</span></>}
        subtitle="From idea to working web application in days — using Cursor, Claude Code, Lovable, and Base44. Real apps. Real data. Real fast."
        ctaLabel="Ship My App →"
        ctaHref="/contact"
        callout={<>Vibe coding isn&apos;t a shortcut — it&apos;s a <span style={{color:'#52C9A0'}}>force multiplier.</span> The same app that used to take 3 months now ships in 3 weeks, with the same quality bar.</>}
      />

      {/* How We Build */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Our AI Toolkit
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              How We Build So Fast
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {TOOLS_WE_USE.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Ship */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              What We Ship
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Real Products, Not Demos
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {WHAT_WE_SHIP.map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 24, background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 28px', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', marginTop: 8 }} />
                <div>
                  <strong style={{ color: 'var(--dark)', fontSize: '1rem' }}>{item.label}</strong>
                  <span style={{ color: 'var(--slate)', fontSize: '0.93rem' }}> — {item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Speed callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              Why Vibe Coding Works
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              AI writes the code. Experienced engineers review it.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              The risk with pure vibe-coded projects is shipping AI slop — code that looks right but breaks in production. We use Cursor and Claude Code as AI co-pilots, not autopilots. Every generated component is reviewed, tested, and hardened by engineers who understand what production actually demands. The result is development velocity that was impossible two years ago, with quality that doesn&apos;t embarrass you.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            What Do You Want to Build?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Describe the app. We&apos;ll scope it, quote it, and ship a working prototype faster than you thought possible.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              Ship My App →
            </a>
            <a href="/portfolio" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              See What We&apos;ve Built
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
