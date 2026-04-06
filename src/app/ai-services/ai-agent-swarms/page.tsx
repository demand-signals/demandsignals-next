import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Agent Swarms — Autonomous Agent Networks | Demand Signals',
  description: 'Networks of specialized AI agents handling marketing operations 24/7. Each agent handles a function. They coordinate through shared data. Always on.',
  path:        '/ai-services/ai-agent-swarms',
  keywords:    ['AI agent swarms', 'multi-agent systems', 'autonomous AI agents', 'AI agent networks'],
})

export default function Page() {
  return (
    <>
    <ServicePageTemplate
      eyebrow="AI Agent Swarms"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Agent Swarms</span><br /><span style={{color:'#52C9A0'}}>A Team That Never Sleeps.</span></>}
      subtitle="Networks of autonomous AI agents handling marketing operations 24/7. Each agent specializes in a function — content, SEO, reviews, outreach. They coordinate through shared data."
      calloutHtml={<>Demand Signals runs <span style={{color:'#52C9A0'}}>19 autonomous AI agents</span> in-house — monitoring search rankings, generating content, responding to reviews, and managing outreach across every client, 24/7/365. We deploy the same architecture for your business.</>}
      ctaLabel="Deploy My Agent Swarm →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'AI Agent Swarms', path: '/ai-services/ai-agent-swarms' },
      ]}
      schemaName="AI Agent Swarms"
      schemaDescription="Autonomous networks of specialized AI agents for business operations."
      schemaUrl="/ai-services/ai-agent-swarms"
      featuresHeading="Specialized Agents, Unified Results"
      features={[
        { icon: '🔍', title: 'Search Intelligence Agent', description: 'Monitors GSC data daily, scores every page, identifies ranking opportunities, and triggers content updates when pages underperform.' },
        { icon: '✍️', title: 'Content Generation Agent', description: 'Writes blog posts, service pages, FAQs, and social content. Produces GEO-optimized content structured for both search engines and AI citation.' },
        { icon: '⭐', title: 'Reputation Agent', description: 'Monitors reviews across platforms, classifies sentiment, drafts responses, and escalates critical reviews. Every review handled within hours.' },
        { icon: '📣', title: 'Social Media Agent', description: 'Generates platform-specific posts, schedules content, and tracks engagement. Maintains your brand voice across every channel.' },
        { icon: '📧', title: 'Outreach Agent', description: 'Researches prospects, crafts personalized messages, manages sequences, and routes qualified leads to your sales process.' },
        { icon: '📊', title: 'Analytics Agent', description: 'Aggregates performance data from all other agents, generates reports, identifies trends, and recommends strategy adjustments.' },
      ]}
      aiCalloutHeading="Not 6 tools. 6 agents working together."
      aiCalloutText="Tools wait for you to use them. Agents act autonomously. Our agent swarms monitor, reason, act, and report — continuously. They coordinate through a shared database, so the content agent knows what the search agent found, the reputation agent informs the social agent, and the analytics agent tracks everything. It's a team. It just never sleeps."
      faqs={[
        { question: 'What is an AI agent swarm?', answer: 'An AI agent swarm is a network of specialized AI agents that handle different business functions, coordinated through a shared database. Each agent has a specific role — one monitors search, another generates content, another handles reviews. They run 24/7 and report results to your portal.' },
        { question: 'How do agents coordinate with each other?', answer: 'Through a shared Supabase database. When the search intelligence agent finds a keyword opportunity, it creates a record that the content agent picks up and writes a page for. When the reputation agent detects a negative review trend, it informs the content agent to create positive content around that topic. The database is the coordination layer.' },
        { question: 'How many agents do I need?', answer: 'It depends on which functions you want automated. Most clients start with 2-3 agents (content + search + reputation) and add more as they see results. The beauty of the architecture is that agents are modular — add or remove them based on your needs.' },
        { question: 'How do AI agent swarms communicate with each other?', answer: 'Our agent swarms coordinate through a shared PostgreSQL database and event-driven message queues. Each agent reads from and writes to shared state — when the content agent publishes a new page, the SEO agent automatically monitors its ranking performance. This coordination happens in real-time without human intervention, and all activity is logged to your dashboard.' },
        { question: 'What happens if one agent in the swarm fails?', answer: 'Each agent operates independently with its own error handling and retry logic, so a failure in one agent does not cascade to the others. If the social media agent encounters an API rate limit, the content and reputation agents continue running normally. Failed runs are logged, you receive a Telegram alert, and the agent automatically retries on its next scheduled cycle.' },
      ]}
      ctaHeading="Ready for AI Agents Working for Your Business 24/7?"
      ctaText="We'll identify which agents would deliver the highest ROI for your business and deploy them within weeks."
      ctaPrimaryLabel="Deploy My Agents →"
      ctaPrimaryHref="/contact"
      serviceCategory="ai-services"
    />
      {/* Proof Section */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Swarm Capabilities
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
            Swarm Intelligence
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
            Networks of specialized agents working in concert. Coordinated through shared databases, reporting through real-time dashboards.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { value: '165+', label: 'Agent Types Available' },
              { value: '24/7/365', label: 'Continuous Operation' },
              { value: 'Shared DB', label: 'Coordinated via Database' },
              { value: 'Real-Time', label: 'Dashboard Reporting' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 16px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#68c5ad', marginBottom: 8 }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
