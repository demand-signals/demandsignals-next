import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'Demand Generation — SEO, GEO, LLM & Local Search | Demand Signals',
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
    question: 'What is LLM optimization and why does it matter in 2026?',
    answer: 'LLM optimization (also called GEO — Generative Engine Optimization) ensures your business appears in AI-generated answers from ChatGPT, Perplexity, Gemini, and Google AI Overviews. With over 800 million weekly ChatGPT users and AI-referred traffic converting at 2.47% — higher than paid search or Google Shopping — businesses that aren\'t optimized for AI discovery are invisible to a growing percentage of buyers.',
  },
  {
    question: 'How is demand generation different from traditional SEO?',
    answer: 'Traditional SEO focuses on Google\'s blue links. Demand generation encompasses all discovery channels: Google organic, Google Maps, AI-generated answers (ChatGPT, Perplexity, Gemini), voice search, and social. We build systems that make your business discoverable everywhere buyers search — not just one platform.',
  },
  {
    question: 'How quickly can I expect to see results from local SEO?',
    answer: 'Most businesses see measurable improvements within 60-90 days. Map Pack rankings often improve faster — within 30-45 days with active GBP management. Organic ranking improvements compound over time as our AI systems continuously optimize your pages and create new content targeting buyer search terms.',
  },
  {
    question: 'Do you work with businesses outside Northern California?',
    answer: 'Yes. While we specialize in Northern California — particularly El Dorado County, Sacramento, Placer County, and the surrounding areas — our demand generation systems work for any geographic market. The same AI-powered approach applies whether you serve one city or fifty.',
  },
]

export default function DemandGenerationPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="Demand Generation"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI-Powered Demand Generation</span> — <span style={{color:'#FF6B2B'}}>Every Channel. Always On.</span></>}
      subtitle="Search, AI answers, Maps, and local discovery — we build the systems that put your business in front of buyers across every channel that matters."
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="Demand Generation"
      breadcrumbPath="/demand-generation"
    />
  )
}
