import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'AI & Agent Services — Automation, Swarms & Infrastructure | Demand Signals',
  description: 'AI adoption strategies, workforce automation, agent swarms, private LLMs, and AI infrastructure. Replace expensive manual processes with AI systems that run 24/7.',
  path:        '/ai-services',
  keywords:    ['AI agent services', 'AI workforce automation', 'AI agent swarms', 'private LLMs', 'AI business automation', 'AI infrastructure'],
})

const SERVICES = [
  {
    icon: '🧠',
    href: '/ai-services/ai-automation-strategies',
    title: 'AI Adoption Strategies',
    description: 'Custom roadmaps to integrate AI across your business. We audit your operations, identify the highest-ROI automation opportunities, and build a phased plan to replace manual work with AI systems.',
    features: ['Operations audit', 'ROI analysis', 'Phased implementation', 'Change management'],
  },
  {
    icon: '👥',
    href: '/ai-services/ai-workforce-automation',
    title: 'AI Workforce Automation',
    description: 'Replace specific, expensive, inconsistent human roles with AI systems that cost less and perform better. Content creation, data entry, scheduling, reporting, customer service — all automatable.',
    features: ['Role replacement analysis', 'Custom AI agents', 'Workflow integration', 'Cost reduction tracking'],
  },
  {
    icon: '🏗️',
    href: '/ai-services/ai-agent-infrastructure',
    title: 'AI Infrastructure',
    description: 'The systems architecture powering AI operations — database design, API integrations, pipeline orchestration, monitoring, and alerting. The plumbing that makes AI agents work reliably.',
    features: ['Supabase + PostgreSQL', 'Pipeline orchestration', 'Monitoring & alerts', 'API integrations'],
  },
  {
    icon: '📧',
    href: '/ai-services/ai-automated-outreach',
    title: 'AI Powered Outreach',
    description: 'Personalized prospecting and lead routing at scale. AI researches prospects, crafts personalized messages, manages sequences, and routes qualified leads to your sales process.',
    features: ['Prospect research AI', 'Personalized messaging', 'Sequence automation', 'Lead scoring & routing'],
  },
  {
    icon: '🐝',
    href: '/ai-services/ai-agent-swarms',
    title: 'AI Agent Swarms',
    description: 'Networks of autonomous AI agents handling marketing operations 24/7. Each agent specializes in a function — content, SEO, reviews, outreach — and they coordinate through shared data.',
    features: ['Multi-agent orchestration', 'Specialized functions', 'Database coordination', '24/7 autonomous operation'],
  },
  {
    icon: '🔒',
    href: '/ai-services/private-llms',
    title: 'AI Private LLMs',
    description: 'Self-hosted language models for businesses with sensitive data. Keep your proprietary information off third-party servers while still leveraging AI for content, analysis, and automation.',
    features: ['On-premise deployment', 'Data sovereignty', 'Custom fine-tuning', 'Enterprise security'],
  },
  {
    icon: '🕷️',
    href: '/ai-services/clawbot-setup',
    title: 'AI Clawbot Setup',
    description: 'Intelligent web crawlers that gather competitive intelligence, monitor pricing, track citations, and feed data to your AI systems. Automated research at scale.',
    features: ['Competitive monitoring', 'Price tracking', 'Citation monitoring', 'Data pipeline automation'],
  },
]

const FAQS = [
  {
    question: 'What business functions can AI realistically replace today?',
    answer: 'In 2026, AI can effectively replace or augment: social media management, content writing, review response management, SEO monitoring and optimization, basic customer service, data entry, appointment scheduling, report generation, email outreach, and marketing coordination. We\'ve done all of these across our client deployments.',
  },
  {
    question: 'How much can I save by replacing roles with AI agents?',
    answer: 'The math varies by role, but typical savings are 60-85% versus human labor costs. A social media manager at $3,000+/month is replaced by AI systems at $800-1,200/month. An SEO consultant at $1,500-3,000/month is replaced by automated monitoring and optimization at a fraction of the cost. We run the numbers for your specific situation during the free consultation.',
  },
  {
    question: 'What is an AI agent swarm?',
    answer: 'An AI agent swarm is a network of specialized AI agents that handle different business functions, coordinated through a shared database. Each agent has a specific role — one monitors search rankings, another generates content, another handles review responses, another manages social media. They run 24/7, report results to your portal, and escalate only what needs human attention.',
  },
  {
    question: 'Do I need technical knowledge to use your AI services?',
    answer: 'No. Everything is accessible through a simple portal where you approve content, review performance, and manage settings. The technical infrastructure — databases, APIs, pipelines, monitoring — is fully managed by us. You spend 10-15 minutes per week in the portal. We handle everything else.',
  },
]

export default function AIServicesPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="AI & Agent Services"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI Agent Services</span> — <span style={{color:'#FF6B2B'}}>The Future of Business Operations.</span></>}
      subtitle="From strategy to implementation — we build and deploy AI systems that replace manual processes, reduce costs, and deliver better results than the teams they replace."
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="AI & Agent Services"
      breadcrumbPath="/ai-services"
    />
  )
}
