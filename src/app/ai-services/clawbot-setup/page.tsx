import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Clawbot Setup — Intelligent Web Crawlers | Demand Signals',
  description: 'Intelligent web crawlers for competitive intelligence, pricing monitoring, citation tracking, and automated research. Data gathering at scale.',
  path:        '/ai-services/clawbot-setup',
  keywords:    ['web crawler setup', 'competitive intelligence', 'price monitoring', 'citation tracking', 'data scraping'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Clawbot Setup"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Clawbots</span><br /><span style={{color:'#52C9A0'}}>Automated Intelligence Gathering.</span></>}
      subtitle="Intelligent web crawlers that gather competitive intelligence, monitor pricing, track citations, and feed data to your AI systems. Automated research at scale."
      ctaLabel="Deploy My Clawbots →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'AI Clawbot Setup', path: '/ai-services/clawbot-setup' },
      ]}
      schemaName="AI Clawbot Setup"
      schemaDescription="Intelligent web crawling for competitive intelligence and data gathering."
      schemaUrl="/ai-services/clawbot-setup"
      featuresHeading="Intelligence Gathering, Automated"
      features={[
        { icon: '🕷️', title: 'Competitive Monitoring', description: 'Track competitor websites for pricing changes, new services, content updates, and positioning shifts. Know what they\'re doing before your customers do.' },
        { icon: '💰', title: 'Price Tracking', description: 'Monitor competitor pricing across multiple sources. Get alerts when prices change. Make data-driven pricing decisions.' },
        { icon: '📊', title: 'Citation Monitoring', description: 'Track where your business (and competitors) are mentioned across the web — directories, review sites, news, and AI-generated content.' },
        { icon: '📰', title: 'Industry News Monitoring', description: 'Crawl industry publications, regulatory sites, and news sources for developments relevant to your business. AI summarizes and alerts.' },
        { icon: '🔗', title: 'Data Pipeline Automation', description: 'Crawled data feeds directly into your AI systems — informing content strategy, pricing decisions, and competitive positioning.' },
        { icon: '⚖️', title: 'Ethical & Compliant', description: 'We respect robots.txt, rate limits, and terms of service. All crawling is ethical, legal, and compliant with platform policies.' },
      ]}
      aiCalloutHeading="Know everything. Automatically."
      aiCalloutText="The businesses that win are the ones that know the most about their market. Our clawbots gather competitive intelligence continuously — monitoring prices, tracking citations, watching competitor moves — and feed that data directly into your AI systems for smarter decisions."
      faqs={[
        { question: 'Is web crawling legal?', answer: 'Yes, when done ethically. We respect robots.txt directives, rate limits, and platform terms of service. We crawl publicly available information — the same information anyone could find by visiting the websites. No hacking, no circumventing access controls.' },
        { question: 'What kind of data can clawbots gather?', answer: 'Publicly available information: competitor pricing, service listings, content updates, directory listings, review data, news mentions, and regulatory filings. We can monitor specific websites on schedule and alert you when changes are detected.' },
        { question: 'How does this feed into my other AI services?', answer: 'Crawled data goes into your Supabase database where other AI agents can use it. The content agent uses competitor analysis to write better content. The search agent uses citation data to identify optimization opportunities. The outreach agent uses prospect research to personalize messages.' },
      ]}
      ctaHeading="Ready for Automated Intelligence?"
      ctaText="We'll identify the data sources most valuable for your business and deploy clawbots to monitor them continuously."
      ctaPrimaryLabel="Deploy My Clawbots →"
      ctaPrimaryHref="/contact"
    />
  )
}
