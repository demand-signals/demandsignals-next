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
      featuresHeading="Enterprise Grade Agent Infrastructure That Guarantees Reliability at Scale"
      features={[
        { icon: '🗄️', title: 'Database Architecture', description: 'Supabase PostgreSQL with row-level security, structured tables for content, pages, pipeline runs, and client data. The foundation everything else runs on.' },
        { icon: '🔌', title: 'API Integrations', description: 'Claude API, Google APIs (GSC, GBP, Analytics), social platform APIs, Stripe, Resend — all wired together with proper authentication and error handling.' },
        { icon: '🔄', title: 'Pipeline Orchestration', description: 'Domain loops that run on schedule — monitoring, reasoning, acting, and logging results. Each loop handles a specific business function autonomously.' },
        { icon: '📊', title: 'Monitoring & Alerts', description: 'Pipeline run tracking, error detection, and Telegram alerts for failures. You know when something needs attention before it impacts results.' },
        { icon: '🔒', title: 'Security & Isolation', description: 'Client data isolated with row-level security. API keys managed in Supabase Vault. No client can see another client\'s data. Ever.' },
        { icon: '📈', title: 'Scalability', description: 'Infrastructure designed to serve 10, 50, or 100 clients from the same base. Each new client adds marginal cost only in API usage.' },
      ]}
      techStack={[
        { label: 'Database', value: 'Supabase PostgreSQL + RLS' },
        { label: 'AI', value: 'Claude API (Sonnet 4.5, Haiku 4.5)' },
        { label: 'Orchestration', value: 'n8n + custom pipeline loops' },
        { label: 'Hosting', value: 'Vercel + Cloudflare' },
        { label: 'Alerts', value: 'Telegram + Resend email notifications' },
        { label: 'Auth', value: 'Supabase Auth + Vault (secrets)' },
      ]}
      techDescription="Our infrastructure stack runs every client on the same base — Supabase, Vercel, Cloudflare — with strict row-level security ensuring complete data isolation. Base cost: $95-265/month regardless of client count."
      stats={[
        { value: 99, suffix: '%', label: 'System Uptime Guarantee' },
        { value: 265, prefix: '$', label: 'Max Base Infrastructure / Month' },
        { value: 19, label: 'Autonomous Agents Running In-House' },
        { value: 60, suffix: 's', label: 'Downtime Detection Time' },
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
    />
  )
}
