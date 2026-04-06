import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Geo-Targeting — Hyper-Local Demand Generation | Demand Signals',
  description: 'Hyper-local targeting across counties, cities, and neighborhoods. Programmatic location pages that rank for every service × city combination in your territory.',
  path:        '/demand-generation/geo-targeting',
  keywords:    ['geo-targeting', 'hyper-local marketing', 'location-based SEO', 'programmatic local pages', 'city service pages'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="Geo-Targeting"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Geo-Targeting</span><br /><span style={{color:'#52C9A0'}}>Own Every Zip Code.</span></>}
      subtitle="Programmatic location pages that rank for every service × city combination in your territory. AI builds them, AI maintains them, AI optimizes them."
      calloutHtml={<>Demand Signals built <span style={{color:'#52C9A0'}}>93 geo-targeted pages</span> for one client — generating #1 rankings for 40+ local search terms across El Dorado County. 72% of consumers who perform a local search visit a store within 5 miles.</>}
      ctaLabel="Target My Territory →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Demand Generation', path: '/demand-generation' },
        { name: 'Geo-Targeting Services', path: '/demand-generation/geo-targeting' },
      ]}
      schemaName="Geo-Targeting Services"
      schemaDescription="Hyper-local geo-targeting with programmatic city × service pages for local market domination."
      schemaUrl="/demand-generation/geo-targeting"
      featuresHeading="How Geo-Targeting Works"
      features={[
        { icon: '🗺️', title: 'County × City × Service Pages', description: 'Programmatic pages for every combination — a plumber serving 10 cities with 5 services gets 50+ unique, optimized pages automatically.' },
        { icon: '📍', title: 'Service Area Targeting', description: 'Define your exact service territory — down to neighborhoods. Every page includes location-specific content, landmarks, and local references.' },
        { icon: '📊', title: 'Local Intent Matching', description: 'AI identifies which city × service combinations have real search demand, so we build pages where buyers are actually looking.' },
        { icon: '🔗', title: 'Internal Link Architecture', description: 'County pages link to cities. City pages link to services. Service pages link to longtails. A structured hierarchy that search engines and AI understand.' },
        { icon: '📝', title: 'Unique Content Per Page', description: 'Every location page has unique content — not templates with city names swapped. AI generates location-specific FAQs, descriptions, and service details.' },
        { icon: '📈', title: 'Compound Growth', description: 'Each new page strengthens the domain\'s topical authority. 50 pages today become 100 next quarter — all building on each other.' },
      ]}
      aiCalloutHeading="93 pages. 40+ #1 rankings. One AI system."
      aiCalloutText="SB Construction went from a 5-page website to 93 geo-targeted pages covering every city and service combination in El Dorado County. The result: #1 rankings for over 40 local search terms and a consistent flow of qualified leads from organic search. Our AI built and maintains every page."
      faqs={[
        { question: 'How many location pages do I need?', answer: 'It depends on your service area and service mix. A business serving 10 cities with 5 services needs approximately 50 longtail pages plus county and city index pages. We analyze search demand to prioritize which combinations to build first.' },
        { question: 'Won\'t Google penalize thin or duplicate content across location pages?', answer: 'Not when done correctly. Our AI generates unique content for every page — location-specific FAQs, service descriptions with local references, and genuine value for the searcher. Google penalizes template pages with swapped city names. We don\'t do that.' },
        { question: 'How do location pages work with AI search engines?', answer: 'Location pages with proper schema markup and FAQ content are excellent for AI citation. When someone asks ChatGPT \'who is the best plumber in Folsom?\' — a well-structured location page with specific, citable content is exactly what the AI looks for.' },
        { question: 'How long does it take to build and deploy geo-targeted pages?', answer: 'Our AI generates pages programmatically, so a full deployment of 50-100 location pages typically takes 2-3 weeks from strategy to live. The first week covers territory mapping and keyword research. The second week is content generation, schema markup, and internal linking. Week three is review, deployment, and sitemap submission. Pages start indexing within days of going live.' },
        { question: 'Can geo-targeting work for businesses that serve customers remotely?', answer: 'Yes. Remote service businesses like consultants, SaaS companies, and virtual service providers use geo-targeting to capture location-specific search demand even without a physical presence. The pages target "service + city" queries that buyers actually search — such as "IT consulting Sacramento" or "virtual bookkeeper Austin." This strategy works because search engines match content relevance, not physical proximity, for service-area businesses.' },
      ]}
      ctaHeading="Ready to Own Your Territory?"
      ctaText="We'll map your service area, identify the highest-value city × service combinations, and tell you exactly how many pages you need."
      ctaPrimaryLabel="Map My Territory →"
      ctaPrimaryHref="/contact"
      serviceCategory="demand-generation"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Geo-Targeting Results
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Hyper-Local Reach
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Programmatic city x service pages capture every local search variation. The data proves hyper-local targeting delivers outsized results.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '72%', label: 'Visit Within 5 Miles' },
                      { value: '93', label: 'Pages Built for One Client' },
                      { value: '#1', label: 'For 40+ Local Terms' },
                      { value: '11', label: 'Cities Covered per Client Avg' },
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
