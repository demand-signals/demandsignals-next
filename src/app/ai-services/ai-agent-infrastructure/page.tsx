import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Agent Infrastructure — The Systems Behind Automation | Demand Signals',
  description: 'Database design, API integrations, pipeline orchestration, monitoring, and alerting — the infrastructure that makes AI agents work reliably at scale.',
  path:        '/ai-services/ai-agent-infrastructure',
  keywords:    ['AI infrastructure', 'agent infrastructure', 'AI pipeline orchestration', 'Supabase AI', 'AI systems architecture'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Infrastructure"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Infrastructure</span><br /><span style={{color:'#52C9A0'}}>The Plumbing That Makes AI Work.</span></>}
      subtitle="Database design, API integrations, pipeline orchestration, monitoring, and alerting — the systems architecture that makes AI agents reliable and scalable."
      ctaLabel="Build My AI Infrastructure →"
      calloutHtml={<>Demand Signals builds the <span style={{color:'#52C9A0'}}>infrastructure that makes AI agents reliable</span> at scale — our base stack runs at $95-265/month total and serves multiple clients with 99.99% uptime, because AI without proper infrastructure is just a chatbot.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'AI Agent Infrastructure', path: '/ai-services/ai-agent-infrastructure' },
      ]}
      schemaName="AI Agent Infrastructure"
      schemaDescription="Systems architecture for reliable AI agent operations."
      schemaUrl="/ai-services/ai-agent-infrastructure"
      featuresHeading="Enterprise-Grade AI Systems"
      features={[
        { icon: '🗄️', title: 'Database Architecture', description: 'Supabase PostgreSQL with row-level security, structured tables for content, pages, pipeline runs, and client data. The foundation everything else runs on.' },
        { icon: '🔌', title: 'API Integrations', description: 'Claude API, Google APIs (GSC, GBP, Analytics), social platform APIs, Stripe, Resend — all wired together with proper authentication and error handling.' },
        { icon: '🔄', title: 'Pipeline Orchestration', description: 'Domain loops that run on schedule — monitoring, reasoning, acting, and logging results. Each loop handles a specific business function autonomously.' },
        { icon: '📊', title: 'Monitoring & Alerts', description: 'Pipeline run tracking, error detection, and Telegram alerts for failures. You know when something needs attention before it impacts results.' },
        { icon: '🔒', title: 'Security & Isolation', description: 'Client data isolated with row-level security. API keys managed in Supabase Vault. No client can see another client\'s data. Ever.' },
        { icon: '📈', title: 'Scalability', description: 'Infrastructure designed to serve 10, 50, or 100 clients from the same base. Each new client adds marginal cost only in API usage.' },
      ]}
      aiCalloutHeading="AI without infrastructure is just a chatbot."
      aiCalloutText="The difference between 'we use AI' and 'we have AI systems' is infrastructure. Chatbots answer questions. Systems monitor, reason, act, log, and improve continuously. Our infrastructure turns AI from a toy into a business tool that generates measurable results."
      faqs={[
        { question: 'What technology stack do you use?', answer: 'Next.js for frontend, Supabase (PostgreSQL) for database and auth, Claude API for intelligence, Vercel for hosting, Cloudflare for DNS/CDN, Stripe for payments, and Resend for email. Total base infrastructure cost: approximately $95-265/month covering all clients.' },
        { question: 'Can you integrate with my existing systems?', answer: 'Yes. We integrate with most business tools via APIs — CRMs (HubSpot, Salesforce), marketing platforms, booking systems, POS systems, and custom databases. If it has an API, we can connect it.' },
        { question: 'How reliable are AI agent systems?', answer: 'Very — with proper infrastructure. Our pipeline monitoring tracks every run, catches failures immediately, and alerts us via Telegram. Most issues are resolved before they impact client-facing results. The systems are designed for graceful degradation — if one component fails, others continue running.' },
        { question: 'How long does it take to set up AI infrastructure from scratch?', answer: 'A baseline system with database, authentication, and one or two pipeline loops typically deploys in 2-3 weeks. More complex builds involving multiple API integrations, custom dashboards, and multi-client isolation take 4-6 weeks. We provision everything on Supabase and Vercel so there is no hardware procurement delay.' },
        { question: 'What happens if an API provider changes their endpoints or pricing?', answer: 'Our pipeline orchestration layer abstracts API calls behind standardized interfaces, so swapping a provider requires changing one integration module rather than rewriting the entire system. We monitor API changelogs for every service we integrate with and proactively update connectors before deprecation deadlines hit. Clients receive a Telegram alert and changelog summary whenever a migration occurs.' },
      ]}
      ctaHeading="Ready for AI Infrastructure That Scales?"
      ctaText="We'll scope the infrastructure you need based on your business requirements and growth plans."
      ctaPrimaryLabel="Scope My Infrastructure →"
      ctaPrimaryHref="/contact"
      serviceCategory="ai-services"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Infrastructure Specs
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Agent Architecture
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Production-grade agent infrastructure at startup pricing. Enterprise reliability without enterprise cost or complexity.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '$95-265', label: 'Monthly Infrastructure Cost' },
                      { value: '99.99%', label: 'Uptime Guarantee' },
                      { value: 'n8n+', label: 'Supabase + Claude Stack' },
                      { value: 'Real-Time', label: 'Monitoring Dashboards' },
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
