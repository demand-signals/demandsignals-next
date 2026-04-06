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
      calloutHtml={<>Demand Signals deploys <span style={{color:'#52C9A0'}}>intelligent web crawlers</span> that gather competitive data continuously — because 89% of businesses say competitive intelligence directly influences their strategy, and companies that monitor competitors systematically grow revenue 2.3x faster than those that don&apos;t.</>}
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
        { question: 'How frequently do clawbots run and how current is the data?', answer: 'Crawl frequency is configured per data source based on how often the target changes. Competitor pricing pages might be crawled daily, while directory listings are checked weekly. Critical monitoring targets like review platforms can be checked every few hours. All crawled data is timestamped and versioned so you can track changes over time and see exactly when a competitor updated their pricing or services.' },
        { question: 'Can clawbots monitor AI-generated search results like ChatGPT or Perplexity?', answer: 'Yes. We deploy specialized crawlers that query AI search engines with your target keywords and track whether your business is being cited in the responses. This is increasingly important as more buyers use AI search instead of Google. The data feeds into your content strategy — if AI engines are not citing you for a key term, we know exactly which content to create or optimize to earn that citation.' },
      ]}
      ctaHeading="Ready for Automated Intelligence?"
      ctaText="We'll identify the data sources most valuable for your business and deploy clawbots to monitor them continuously."
      ctaPrimaryLabel="Deploy My Clawbots →"
      ctaPrimaryHref="/contact"
      serviceCategory="ai-services"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Intelligence ROI
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Competitive Intelligence
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Know what your competitors are doing before they announce it. Automated intelligence gathering drives faster, smarter decisions.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '89%', label: 'Say CI Influences Strategy' },
                      { value: '2.3x', label: 'Faster Revenue Growth' },
                      { value: 'Daily', label: 'Automated Monitoring' },
                      { value: 'Legal', label: 'Ethical Crawling Only' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 16px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#68c5ad', marginBottom: 8 }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
      }
    />
  )
}
