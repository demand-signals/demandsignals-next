import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Demand Gen Systems — Automated Lead Pipelines | Demand Signals',
  description: 'Full-stack demand generation pipelines that run 24/7. AI monitors search performance, identifies opportunities, generates content, and routes qualified leads.',
  path:        '/demand-generation/systems',
  keywords:    ['demand generation systems', 'automated lead generation', 'marketing automation', 'AI marketing pipeline', 'lead routing'],
})

export default function Page() {
  return (
    <>
    <ServicePageTemplate
      eyebrow="Demand Gen Systems"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Demand Gen Systems</span><br /><span style={{color:'#52C9A0'}}>Pipelines That Run 24/7.</span></>}
      subtitle="Full-stack demand generation pipelines — AI monitors performance, identifies opportunities, creates content, optimizes pages, and routes leads. All automated. All always on."
      calloutHtml={<>Demand Signals built the <span style={{color:'#52C9A0'}}>domain loop architecture</span> — three AI systems that coordinate 24/7 across search monitoring, content creation, and optimization. Companies using marketing automation see a 451% increase in qualified leads compared to those relying on manual processes.</>}
      ctaLabel="Build My Pipeline →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Demand Generation', path: '/demand-generation' },
        { name: 'Demand Generation Systems', path: '/demand-generation/systems' },
      ]}
      schemaName="Demand Generation Systems"
      schemaDescription="Automated demand generation pipelines with AI monitoring, content creation, and lead routing."
      schemaUrl="/demand-generation/systems"
      featuresHeading="The Domain Loop Architecture"
      features={[
        { icon: '🔄', title: 'Website Intelligence Loop', description: 'AI monitors every page daily — GSC data, rankings, AI citations. Pages that underperform get rewritten. New opportunities get new pages built. Continuously.' },
        { icon: '✍️', title: 'Content & Social Loop', description: 'AI generates blog posts, social media, GBP posts, and review responses on schedule. Content calendar planned monthly, executed daily.' },
        { icon: '⭐', title: 'Reputation Loop', description: 'Reviews monitored across platforms, responses drafted, sentiment tracked, and alerts sent for critical reviews. Every review handled, every time.' },
        { icon: '📊', title: 'Performance Dashboard', description: 'Real-time visibility into rankings, traffic, AI citations, content published, and leads generated. One portal, everything you need to know.' },
        { icon: '🔀', title: 'Lead Routing', description: 'Qualified leads from forms, calls, and chat automatically routed to the right person on your team with full context on how they found you.' },
        { icon: '📈', title: 'Compound Growth', description: 'Each loop feeds the others. Better content → better rankings → more authority → better AI citations → more traffic → more data → better content. The flywheel spins faster every month.' },
      ]}
      aiCalloutHeading="Three loops. Zero employees. Always on."
      aiCalloutText="Traditional agencies have teams of people doing these tasks manually. We replaced those teams with three AI domain loops that coordinate through a shared database. They run 24/7, they never take vacation, and they get better over time. That's why our clients get better results at a fraction of the cost."
      faqs={[
        { question: 'What is a domain loop?', answer: 'A domain loop is a self-reinforcing AI system that monitors a specific business function, reasons about what to do, takes action, and measures results — continuously. We run three: Website Intelligence (search optimization), Content & Social (content generation), and Reputation (review management). They coordinate through a shared database.' },
        { question: 'How is this different from marketing automation tools like HubSpot?', answer: 'Marketing automation tools require you to set up workflows, write content, and monitor results. Our domain loops do all of that autonomously. The AI writes the content, identifies the opportunities, creates the pages, and monitors the results. You approve — AI does the rest.' },
        { question: 'What does my involvement look like week to week?', answer: 'About 10 minutes. Log into your portal, approve upcoming content, review performance metrics, and flag anything that needs attention. The AI handles everything else — research, writing, publishing, optimization, and monitoring.' },
        { question: 'How long does it take for a demand gen system to produce measurable results?', answer: 'Content and social output begin immediately — you will see published posts and articles within the first week. Search ranking improvements typically appear within 30-60 days as Google indexes new content and recognizes increased publishing frequency. The compounding effect kicks in around month 3-4, when dozens of optimized pages start reinforcing each other and driving consistent organic lead flow.' },
        { question: 'Can demand gen systems integrate with my existing CRM and sales tools?', answer: 'Yes. Our systems connect to HubSpot, Salesforce, Pipedrive, and most CRMs via API integration. Leads generated through forms, calls, or chat are automatically routed into your CRM with full attribution data — which page they came from, which keyword they searched, and which content they engaged with. This closes the loop between marketing activity and revenue so you can see exactly which AI-driven efforts are producing paying customers.' },
      ]}
      ctaHeading="Ready for Demand Gen on Autopilot?"
      ctaText="We'll audit your current marketing operations and show you exactly which functions AI can handle — and how much you'll save."
      ctaPrimaryLabel="Get My Free Audit →"
      ctaPrimaryHref="/tools/demand-audit"
      serviceCategory="demand-generation"
    />
      {/* Proof Section */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Pipeline Results
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
            Demand Gen Pipeline
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
            A complete demand generation system running on autopilot. Three AI loops coordinating 24/7 across search, content, and reputation.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { value: '451%', label: 'Increase in Qualified Leads' },
              { value: '24/7', label: 'Automated Monitoring' },
              { value: '6-Layer', label: 'Demand System' },
              { value: '<90s', label: 'Average Response Time' },
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
