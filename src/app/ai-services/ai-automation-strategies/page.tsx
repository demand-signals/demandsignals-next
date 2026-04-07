import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Adoption Strategies — Custom AI Roadmaps | Demand Signals',
  description: 'Custom roadmaps to integrate AI across your business. We audit operations, identify highest-ROI automation opportunities, and build phased implementation plans.',
  path:        '/ai-services/ai-automation-strategies',
  keywords:    ['AI adoption strategy', 'AI business roadmap', 'AI consulting', 'business AI integration'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Adoption Strategies"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Adoption Strategies</span><br /><span style={{color:'#52C9A0'}}>Know Where to Start.</span></>}
      subtitle="Custom roadmaps to integrate AI across your business. We audit your operations, identify the highest-ROI opportunities, and build a phased plan."
      ctaLabel="Get My AI Roadmap →"
      calloutHtml={<>Demand Signals builds <span style={{color:'#52C9A0'}}>phased AI adoption roadmaps</span> that start with the highest-ROI wins first — because 72% of businesses say they struggle to move past AI pilots into production, and the average company wastes $1.3M on AI projects that never ship.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'AI Adoption Strategies', path: '/ai-services/ai-automation-strategies' },
      ]}
      schemaName="AI Adoption Strategies"
      schemaDescription="Custom AI integration roadmaps for businesses."
      schemaUrl="/ai-services/ai-automation-strategies"
      featuresHeading="A Custom AI Roadmap Built Around Your Highest-ROI Wins"
      features={[
        { icon: '🔍', title: 'Operations Audit', description: 'We map every manual process in your business — who does what, how long it takes, what it costs. Then we identify which processes AI can handle.' },
        { icon: '📊', title: 'ROI Analysis', description: 'Dollar-for-dollar comparison: current cost of manual work vs. cost of AI replacement. Clear numbers, not speculation.' },
        { icon: '🗺️', title: 'Phased Roadmap', description: 'A step-by-step implementation plan prioritized by ROI. Start with quick wins, build to full automation. No big-bang rollouts.' },
        { icon: '🔄', title: 'Change Management', description: 'Practical guidance for your team — training, workflows, and communication plans that make the transition smooth.' },
        { icon: '🏗️', title: 'Tool Selection', description: 'We recommend the right AI tools for each function — not the ones with the biggest marketing budgets, the ones that actually work.' },
        { icon: '📈', title: 'Success Metrics', description: 'Clear KPIs for each phase — time saved, cost reduced, output increased. You\'ll know exactly what\'s working and what needs adjustment.' },
      ]}
      techStack={[
        { label: 'Audit', value: 'Operations mapping + ROI analysis' },
        { label: 'AI Tools', value: 'Claude API, n8n, Supabase' },
        { label: 'Reporting', value: 'Custom client portal dashboard' },
        { label: 'Integration', value: 'HubSpot, Salesforce, Zapier, custom APIs' },
        { label: 'Timeline', value: '1-2 week audit → phased implementation' },
        { label: 'Support', value: 'Ongoing optimization + Telegram alerts' },
      ]}
      techDescription="We audit your current operations, map every manual process to an AI solution, and build a phased roadmap that starts with the highest-ROI wins — typically deployable within 2-4 weeks."
      stats={[
        { value: 95, suffix: '%', label: 'AI Projects Fail Without Strategy' },
        { value: 72, suffix: '%', label: "Can't Move Past AI Pilots" },
        { value: 451, suffix: '%', label: 'More Leads with Automation' },
        { value: 4, suffix: 'wk', label: 'Avg Time to Deployment' },
      ]}
      aiCalloutHeading="Most businesses don't need more AI tools. They need a plan."
      aiCalloutText="The gap isn't technology — it's knowing where to apply it. We've deployed AI systems across every industry — from construction to legal to hospitality. We know which processes automate well and which don't. Our roadmap gives you a clear path from where you are to where AI can take you."
      faqs={[
        { question: 'How long does an AI strategy engagement take?', answer: 'The initial audit and roadmap typically takes 1-2 weeks. Implementation follows the phased plan — quick wins in weeks 1-4, core systems in months 1-3, full automation in months 3-6. The pace depends on your business complexity.' },
        { question: 'Do I need technical staff to implement AI?', answer: 'No. We handle the technical implementation. Your team needs to participate in the audit (telling us how things work today) and the change management (adopting new workflows). The technology is fully managed by us.' },
        { question: 'What if AI isn\'t the right solution for my business?', answer: 'We\'ll tell you. Not every process benefits from AI automation. Our audit identifies which functions have clear ROI and which are better left as-is. We\'d rather give honest advice than sell you something that won\'t deliver results.' },
        { question: 'What industries benefit most from AI adoption strategies?', answer: 'Service-based businesses with repetitive marketing, content, and customer communication tasks see the fastest ROI — construction, legal, healthcare, real estate, and hospitality are consistently strong candidates. Any business spending $5,000+/month on marketing labor or agency retainers typically has multiple high-ROI automation opportunities. We have deployed AI systems across dozens of industries and can benchmark expected results against similar businesses.' },
        { question: 'How do you measure success after the AI roadmap is implemented?', answer: 'Every phase in the roadmap includes specific KPIs — hours saved per week, cost reduction per function, content output volume, and lead generation metrics. We set baselines during the audit so improvements are measured against real numbers, not estimates. Monthly reports compare pre-AI and post-AI performance for each automated function, giving you clear visibility into return on investment.' },
      ]}
      ctaHeading="Ready to See What AI Can Do for Your Business?"
      ctaText="Start with a free AI readiness audit. We'll identify your top 3 automation opportunities and the expected ROI for each."
      ctaPrimaryLabel="Get My AI Readiness Audit →"
      ctaPrimaryHref="/tools/demand-audit"
      serviceCategory="ai-services"
    />
  )
}
