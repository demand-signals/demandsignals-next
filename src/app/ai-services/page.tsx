import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'AI Agent Services & Automation | Demand Signals',
  description: 'AI adoption strategies, workforce automation, agent swarms, private LLMs, and AI infrastructure. Replace manual processes with AI systems that run 24/7.',
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
    question: 'What business problems are AI agents best at solving?',
    answer: 'AI agents excel at high-volume, repetitive, research-intensive tasks that currently eat up your team\'s time. Lead qualification and outreach, content generation at scale, competitive monitoring, data extraction and aggregation, customer review management, appointment scheduling, and internal reporting are all areas where agents outperform humans in speed, consistency, and cost — often by a factor of 10x or more.',
  },
  {
    question: 'How long does it take to implement AI systems for my business?',
    answer: 'Most initial AI system deployments take 2–4 weeks from kickoff to live operation. Simpler automations like review responders or AI content pipelines can go live in under a week. More complex agent swarms — such as full lead research and outreach systems or multi-department workflow automation — typically take 4–8 weeks to design, build, test, and tune. We always start with a discovery phase to identify your highest-ROI use case and build there first.',
  },
  {
    question: 'What is the return on investment for AI workforce automation?',
    answer: 'The ROI depends on what you\'re automating, but replacing a single full-time marketing or admin role with an AI system that costs a fraction of the monthly salary is the most common win. Clients who implement our outreach agents routinely generate 3–5x more qualified prospect touchpoints per week than their sales team could manage manually. The key is identifying the right processes to automate first — which is exactly what our adoption strategy service does.',
  },
  {
    question: 'Do I need technical staff to manage the AI systems you deploy?',
    answer: 'No. We build every system to be managed by non-technical business owners. Dashboards are simple, alerts are plain-language, and we handle all the maintenance, updates, and model improvements behind the scenes. Your team interacts with the outputs — leads, content, reports, responses — not with the infrastructure. If something needs attention, your dedicated strategist handles it.',
  },
  {
    question: 'What makes a private LLM different from just using ChatGPT?',
    answer: 'A private LLM runs on your infrastructure with your data, your customizations, and your security controls. It can be trained or fine-tuned on your company\'s specific knowledge — products, pricing, policies, past conversations — so it answers questions the way your business would. Nothing leaves your environment, which matters for industries with privacy requirements like healthcare, legal, and finance. It also doesn\'t share your competitive intelligence with a public model.',
  },
]

export default function AIServicesPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="AI & Agent Services"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI Agent Services</span> — <span style={{color:'#FF6B2B'}}>The Future of Business Operations.</span></>}
      subtitle="From strategy to implementation — we build and deploy AI systems that replace manual processes, reduce costs, and deliver better results than the teams they replace."
      calloutHtml={<>Our AI agent systems work 24/7 so your team <span style={{color:'#52C9A0'}}>stops doing the tasks AI does better</span> — and starts focusing on the strategy, relationships, and decisions that only humans can handle.</>}
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="AI & Agent Services"
      breadcrumbPath="/ai-services"
    />
  )
}
