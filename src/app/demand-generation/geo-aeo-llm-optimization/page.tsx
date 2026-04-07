import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'LLM Optimization — GEO, AEO & AI Search Visibility | Demand Signals',
  description: 'Get your business cited by ChatGPT, Perplexity, Gemini, and Google AI Overviews. GEO optimization, AEO, llms.txt, and structured data for AI discovery.',
  path:        '/demand-generation/geo-aeo-llm-optimization',
  keywords:    ['LLM optimization', 'GEO optimization', 'generative engine optimization', 'AEO', 'AI search visibility', 'ChatGPT citations', 'llms.txt'],
})

export default function LLMOptimizationPage() {
  return (
    <ServicePageTemplate
      eyebrow="LLM Optimization"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Get Cited by AI.</span><br /><span style={{color:'#52C9A0'}}>Not Just Ranked by Google.</span></>}
      subtitle="When someone asks ChatGPT, Perplexity, or Gemini who to hire in your area — your name comes up. We make that happen with GEO, AEO, and llms.txt optimization."
      ctaLabel="Optimize for AI Search →"
      calloutHtml={<>Demand Signals specializes in the discovery channel most agencies ignore — LLM-referred traffic converts at <span style={{color:'#52C9A0'}}>2.47%</span>, higher than Google Shopping, paid search, or paid social. 48% of Google searches now trigger AI Overviews, and it costs <span style={{color:'#52C9A0'}}>zero ad spend</span>.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Demand Generation', path: '/demand-generation' },
        { name: 'LLM Optimization', path: '/demand-generation/geo-aeo-llm-optimization' },
      ]}
      schemaName="LLM & GEO Optimization"
      schemaDescription="Generative Engine Optimization services to get businesses cited by ChatGPT, Perplexity, Gemini, and Google AI Overviews."
      schemaUrl="/demand-generation/geo-aeo-llm-optimization"
      featuresHeading="Get Cited by ChatGPT, Perplexity & Google AI — Not Just Ranked"
      features={[
        { icon: '🔍', title: 'Traditional SEO (Foundation)', description: 'SEO isn\'t dead — it\'s the foundation. Strong site speed, clean architecture, schema markup, and internal linking benefit ALL discovery channels including AI search.' },
        { icon: '🔮', title: 'GEO (Generative Engine Optimization)', description: 'Content structured so AI platforms cite and recommend your business. Direct answers first, question-format headers, citable data, and extractable content blocks.' },
        { icon: '🤖', title: 'AEO (Answer Engine Optimization)', description: 'Technical implementation for AI consumption — llms.txt files, llms-full.txt, FAQPage schema, structured data, and machine-readable business information.' },
        { icon: '📊', title: 'AI Citation Monitoring', description: 'Track how often your business is cited in AI-generated answers across ChatGPT, Perplexity, Gemini, and Google AI Overviews. The metric no other agency shows you.' },
        { icon: '📝', title: 'Content Citability Audits', description: 'We audit every page on your site: Is this content something an AI would confidently quote? If not, we rewrite it with direct answers, specific data, and extractable blocks.' },
        { icon: '🔄', title: 'Continuous Optimization', description: 'AI visibility isn\'t a one-time project. Our systems continuously monitor citations, update llms.txt, refresh content, and optimize schema — 24/7, automatically.' },
      ]}
      techStack={[
        { label: 'llms.txt', value: 'Auto-generated AI discovery file at domain root' },
        { label: 'Schema', value: 'LocalBusiness, Service, FAQPage, HowTo, Article' },
        { label: 'Monitoring', value: 'AI citation tracking across major LLM platforms' },
        { label: 'Content', value: 'GEO-structured with direct answers + citable data' },
        { label: 'Freshness', value: 'Automated content updates with real timestamps' },
        { label: 'E-E-A-T', value: 'Experience, expertise, authority, trust signals' },
      ]}
      techDescription="We implement the full technical stack for AI discoverability — from llms.txt files that tell AI systems what your site is about, to structured data that AI uses to verify information, to content architecture designed to be cited in AI-generated answers."
      stats={[
        { value: 48, suffix: '%', label: 'Searches Trigger AI Overviews' },
        { value: 61, suffix: '%', label: 'CTR Drop Without GEO' },
        { value: 527, suffix: '%', label: 'AI Referral Growth YoY' },
        { value: 72, suffix: '%', label: 'AI Citations Go to Top 3' },
      ]}
      aiCalloutHeading="The competitive window is open right now."
      aiCalloutText="Most agencies are still selling SEO as the whole story. Citation authority in AI, like domain authority in Google, builds over time. Starting now is the equivalent of investing in SEO in 2010. The businesses that build citation authority now will compound that advantage as AI search grows 40% quarter over quarter."
      faqs={[
        { question: 'What is GEO (Generative Engine Optimization)?', answer: 'GEO optimizes your content so that AI platforms — ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude — cite and recommend your business when answering user queries. A page can rank #1 in Google but never get cited by ChatGPT if it lacks the structural elements AI engines prioritize. GEO ensures your content has those elements.' },
        { question: 'What is llms.txt and why do I need it?', answer: 'llms.txt is a curated, markdown-formatted file at your domain root that tells AI systems what your site is about, what your key pages are, and where to find important content. Think of it as a sitemap for AI. Every site Demand Signals builds includes auto-generated llms.txt that updates whenever your content changes.' },
        { question: 'How do you measure AI search visibility?', answer: 'We track AI citation count — how many times your business is mentioned in AI-generated answers per month. We break this down by platform (ChatGPT, Perplexity, Gemini, Google AI Overviews), trending queries, and competitor comparison. This is shown in your client portal alongside traditional search metrics.' },
        { question: 'Is LLM optimization worth the investment if I already rank well in Google?', answer: 'Yes — because Google\'s AI Overviews are cannibalizing traditional clicks. When AI Overviews are present, organic click-through rates drop by 61%. Meanwhile, 58.5% of Google searches already end without a click. LLM optimization ensures you capture traffic from the growing AI search channel, not just the declining traditional channel.' },
      ]}
      ctaHeading="Ready to Be Cited by AI?"
      ctaText="Get a free AI visibility audit — we'll show you how often your business appears in AI-generated answers compared to your competitors."
      ctaPrimaryLabel="Get My AI Visibility Audit →"
      ctaPrimaryHref="/tools/demand-audit"
      ctaSecondaryLabel="Book a Call"
      serviceCategory="demand-generation"
    />
  )
}
