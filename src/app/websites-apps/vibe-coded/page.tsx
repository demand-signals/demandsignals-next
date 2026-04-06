import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Vibe Coded Web Apps — AI-Built, Ship in Days | Demand Signals',
  description: 'AI-built web applications shipped fast using Cursor, Claude Code, and modern AI tools. Prototype to production in days, not months. Real databases, real deployment.',
  path:        '/websites-apps/vibe-coded',
  keywords:    ['vibe coding', 'AI-built web apps', 'Cursor development', 'Claude Code', 'rapid prototyping', 'AI development'],
})

export default function VibeCodedPage() {
  return (
    <ServicePageTemplate
      eyebrow="Vibe Coded Web Apps"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Vibe Coded Apps</span><br /><span style={{color:'#52C9A0'}}>Ship in Days, Not Months.</span></>}
      subtitle="AI-built web applications using Cursor, Claude Code, and modern AI development tools. From idea to production faster than you thought possible."
      ctaLabel="Ship My App Fast →"
      calloutHtml={<>Demand Signals uses <span style={{color:'#52C9A0'}}>AI-assisted development</span> to ship production web apps at 5-10x the speed of traditional agencies — cutting build timelines by 40-60% and delivering working software in days, not months.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'Vibe Coded Web Apps', path: '/websites-apps/vibe-coded' },
      ]}
      schemaName="Vibe Coded Web App Development"
      schemaDescription="AI-built web applications shipped in days using Cursor, Claude Code, and modern AI tools."
      schemaUrl="/websites-apps/vibe-coded"
      featuresHeading="How Vibe Coding Works"
      features={[
        { icon: '⚡', title: 'AI-Accelerated Development', description: 'Cursor and Claude Code write production-quality code from natural language descriptions. We guide the AI, review the output, and ship features at 5-10x the speed of traditional development.' },
        { icon: '🗄️', title: 'Real Databases, Real Auth', description: 'Not toy prototypes — real Supabase backends with PostgreSQL, row-level security, authentication, and file storage. Production-grade infrastructure from day one.' },
        { icon: '🚀', title: 'Same-Week Deployments', description: 'Vercel deployment pipeline means every feature goes live the same day it is built. No staging delays, no deployment drama.' },
        { icon: '🔄', title: 'Rapid Iteration', description: 'See something you want changed? AI rebuilds it in minutes, not days. The feedback loop between "I want this" and "here it is" is measured in hours.' },
        { icon: '📊', title: 'Internal Tools & Dashboards', description: 'Admin panels, data dashboards, CRM tools, reporting interfaces — the tools your team needs, built in days instead of weeks.' },
        { icon: '🧪', title: 'MVPs & Validation', description: 'Test business ideas with real, working products before committing to full development. If the idea works, we scale it. If it doesn\'t, you saved months of engineering cost.' },
      ]}
      techStack={[
        { label: 'AI Tools', value: 'Cursor, Claude Code, Claude API' },
        { label: 'Framework', value: 'Next.js, React, TypeScript' },
        { label: 'Backend', value: 'Supabase (PostgreSQL + Auth + Realtime)' },
        { label: 'Hosting', value: 'Vercel Pro (edge deployment)' },
        { label: 'Styling', value: 'Tailwind CSS + shadcn/ui' },
        { label: 'Timeline', value: 'Days to weeks (not months)' },
      ]}
      techDescription="Vibe coding uses AI to write production code at 5-10x the speed of traditional development. We pair 30 years of development experience with cutting-edge AI tools to deliver working software faster than any traditional agency."
      aiCalloutHeading="30 years of experience + AI tools = unfair advantage."
      aiCalloutText="Vibe coding isn't about replacing expertise — it's about amplifying it. Our team has 30 years of web development experience. AI tools let us apply that experience 10x faster. The result: production-quality applications delivered in days, not the months traditional agencies quote."
      faqs={[
        { question: 'What is vibe coding?', answer: 'Vibe coding is a development approach where AI tools like Cursor and Claude Code generate production code from natural language descriptions, guided by experienced developers. Instead of writing every line manually, developers describe what they want and AI writes the implementation. The developer reviews, refines, and ships — dramatically accelerating the development cycle.' },
        { question: 'Are vibe-coded apps production quality?', answer: 'Yes — when guided by experienced developers. The AI writes code that follows best practices, but the quality depends on the developer reviewing and refining it. Our team has 30 years of development experience — we know what production code looks like and ensure every app meets that standard.' },
        { question: 'How much do vibe-coded apps cost compared to traditional development?', answer: 'Typically 40-60% less than traditional development because the build timeline is dramatically shorter. A project that would take a traditional agency 8-12 weeks can be completed in 1-3 weeks with vibe coding, which means lower labor costs and faster time-to-value.' },
        { question: 'Can vibe-coded apps scale?', answer: 'Absolutely. The underlying technology is the same — Next.js, Supabase, Vercel, TypeScript. These are enterprise-grade tools used by companies like Netflix, TikTok, and Notion. The apps scale the same way regardless of how fast they were built.' },
      ]}
      ctaHeading="Got an Idea? Let's Ship It This Week."
      ctaText="Describe what you need and we'll tell you how fast we can build it — usually same day."
      ctaPrimaryLabel="Let's Build It →"
      serviceCategory="websites-apps"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Speed Metrics
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Ship Speed Advantage
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Vibe coding with Cursor and Claude Code collapses timelines from months to days, delivering production software at a fraction of traditional cost.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '5-10x', label: 'Faster Delivery' },
                      { value: '40-60%', label: 'Cost Reduction' },
                      { value: '73%', label: 'AI-Assisted Code' },
                      { value: '2-5x', label: 'Productivity Gain' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 16px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#68c5ad', marginBottom: 8 }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
      }
    />
  )
}
