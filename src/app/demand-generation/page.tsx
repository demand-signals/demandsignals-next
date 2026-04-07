import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'AI Demand Generation & Local SEO | Demand Signals',
  description: 'Full-stack demand generation: LLM optimization, local SEO, geo-targeting, Google Business Profile management, and automated demand systems. AI-powered, always on.',
  path:        '/demand-generation',
  keywords:    ['demand generation', 'LLM optimization', 'local SEO Sacramento', 'GEO optimization', 'Google Business Profile management', 'AI search optimization'],
})

const SERVICES = [
  {
    icon: '🔮',
    href: '/demand-generation/geo-aeo-llm-optimization',
    title: 'LLM Optimization',
    description: 'Get your business cited by ChatGPT, Perplexity, Gemini, and Google AI Overviews. We optimize your content structure, schema markup, and llms.txt for AI discovery — the fastest-growing search channel.',
    features: ['GEO / AEO optimization', 'llms.txt management', 'AI citation monitoring', 'Schema markup automation'],
  },
  {
    icon: '📍',
    href: '/demand-generation/local-seo',
    title: 'Local SEO',
    description: 'Dominate your local market in organic search. Longtail keyword targeting, citation building, review platform optimization, and programmatic city × service pages that compound authority.',
    features: ['Longtail keyword strategy', 'Citation building', 'GSC monitoring', 'Programmatic content'],
  },
  {
    icon: '🎯',
    href: '/demand-generation/geo-targeting',
    title: 'Geo-Targeting',
    description: 'Hyper-local targeting across counties, cities, and neighborhoods. We build programmatic location pages that rank for every service × city combination in your territory.',
    features: ['County × city pages', 'Service area targeting', 'Local content strategy', 'Map Pack optimization'],
  },
  {
    icon: '📌',
    href: '/demand-generation/gbp-admin',
    title: 'Google Business Admin',
    description: 'Full GBP management — posts, photos, Q&A responses, attribute optimization, and review monitoring. Your Google Business Profile stays active and competitive without you touching it.',
    features: ['GBP post scheduling', 'Review monitoring', 'Q&A management', 'Photo optimization'],
  },
  {
    icon: '⚙️',
    href: '/demand-generation/systems',
    title: 'Demand Gen Systems',
    description: 'Full-stack demand generation pipelines that run 24/7. AI monitors your search performance, identifies opportunities, creates content, and reports results — all automatically.',
    features: ['Automated pipelines', 'AI content generation', 'Performance monitoring', 'Lead routing'],
  },
]

const FAQS = [
  {
    question: 'How quickly can demand generation campaigns start producing results?',
    answer: 'Local SEO improvements are typically visible within 60–90 days as Google reindexes and re-evaluates your authority signals. GBP optimization and citation building produce ranking lifts in Google Maps within 30–45 days. AI search citation rates improve within weeks of publishing properly structured content. We provide monthly reporting so you can see exactly what\'s moving.',
  },
  {
    question: 'What is the difference between SEO, GEO, and AEO — and why do all three matter?',
    answer: 'Traditional SEO targets Google and Bing. Generative Engine Optimization (GEO) targets AI-powered search summaries like ChatGPT and Perplexity, which now answer millions of queries before users ever click a link. Answer Engine Optimization (AEO) targets featured snippets and voice search. Running all three simultaneously creates a discovery layer most of your competitors haven\'t built yet.',
  },
  {
    question: 'Can you help if my competitors are already dominating local search?',
    answer: 'Yes — and this is often where we do our best work. We analyze your competitors\' authority signals, content gaps, and citation profile, then build a strategy that overtakes them systematically. Dominant competitors have weaknesses. Our research agents find them and we exploit them with consistent, high-quality signals that compound over time.',
  },
  {
    question: 'Do I need to already have a website for demand generation to work?',
    answer: 'You need a solid online presence, but it doesn\'t have to be perfect before we start. Many clients come to us with an outdated site and we run demand generation in parallel with a rebuild. GBP optimization, citation building, and review management can begin immediately, while the new website adds fuel once it launches.',
  },
  {
    question: 'How do AI-powered demand systems outperform traditional agencies?',
    answer: 'Traditional agencies bill hours for manual tasks — writing one blog post at a time, manually checking rankings, sending monthly reports. Our systems monitor your search presence daily, update content automatically, respond to reviews in real time, and push your business into new ranking positions continuously. The output is higher, the speed is faster, and the cost is a fraction of a traditional retainer.',
  },
]

export default function DemandGenerationPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="Demand Generation"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI-Powered Demand Generation</span> — <span style={{color:'#FF6B2B'}}>Every Channel. Always On.</span></>}
      subtitle="Search, AI answers, Maps, and local discovery — we build the systems that put your business in front of buyers across every channel that matters."
      calloutHtml={<>We run a <span style={{color:'#52C9A0'}}>three-layer discovery strategy</span> — traditional SEO, Generative Engine Optimization, and Answer Engine Optimization — so your business gets found everywhere customers are searching, including AI chat.</>}
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="Demand Generation"
      breadcrumbPath="/demand-generation"
    />
  )
}
