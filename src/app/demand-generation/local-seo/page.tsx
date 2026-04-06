import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title: 'Local SEO — Dominate Your Market | Demand Signals',
  description: 'Full-stack local SEO: longtail targeting, citation building, review optimization, and programmatic content. AI-powered, continuously optimized.',
  path: '/demand-generation/local-seo',
  keywords: ['local SEO', 'local search optimization', 'SEO Sacramento', 'local SEO El Dorado County', 'citation building', 'Map Pack optimization'],
})

export default function LocalSEOPage() {
  return (
    <>
    <ServicePageTemplate
      eyebrow="Local SEO"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Local SEO</span> That<br /><span style={{color:'#52C9A0'}}>Never Stops Working.</span></>}
      subtitle="AI-powered local search optimization — longtail keyword targeting, citation building, review management, and programmatic content that compounds authority automatically."
      ctaLabel="Dominate My Local Market →"
      calloutHtml={<>Demand Signals deploys AI that monitors your search rankings <span style={{color:'#52C9A0'}}>daily, not monthly</span> — because 46% of all Google searches have local intent, and businesses that publish consistently see 3.5x more indexed pages driving organic traffic compared to those that blog sporadically.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Demand Generation', path: '/demand-generation' },
        { name: 'Local SEO', path: '/demand-generation/local-seo' },
      ]}
      schemaName="Local SEO Services"
      schemaDescription="AI-powered local search optimization with longtail targeting, citation building, and continuous content optimization."
      schemaUrl="/demand-generation/local-seo"
      featuresHeading="Local SEO Done by AI"
      features={[
        { icon: '📍', title: 'Longtail Keyword Targeting', description: 'Programmatic city × service pages targeting every combination in your territory. 50-200+ pages that each rank for specific local search terms.' },
        { icon: '📋', title: 'Citation Building', description: 'Consistent NAP (Name, Address, Phone) across 50+ directories, review platforms, and local data aggregators. The foundation of local authority.' },
        { icon: '📊', title: 'GSC Monitoring', description: 'Daily Google Search Console data pulls, automated page scoring, and AI-identified ranking opportunities. Every page tracked, every trend caught.' },
        { icon: '🔗', title: 'Internal Linking', description: 'AI-maintained internal linking structure that distributes authority to your most important pages. Updated automatically as new pages are created.' },
        { icon: '⚡', title: 'Page Speed Optimization', description: 'Core Web Vitals optimization for every page — image compression, lazy loading, code splitting, and caching. Faster pages rank better.' },
        { icon: '🏗️', title: 'Schema Markup', description: 'LocalBusiness, Service, FAQ, HowTo, and Review schema on every page. The structured data that Google and AI search engines need to understand your business.' },
      ]}
      aiCalloutHeading="AI replaces your $3,000/month SEO consultant."
      aiCalloutText="Traditional SEO agencies check in once a month, send a report, and make incremental changes. Our AI monitors every page every day, identifies what's working and what isn't, and rewrites underperforming content automatically. Better results, fraction of the cost, no gaps."
      faqs={[
        { question: 'How is AI-powered SEO different from traditional SEO?', answer: 'Traditional SEO relies on a consultant checking data monthly and making manual changes. Our AI monitors your Google Search Console data daily, scores every page automatically, identifies ranking opportunities in real-time, and creates optimized content without manual intervention. It\'s the difference between a monthly checkup and 24/7 monitoring.' },
        { question: 'How quickly will I see local SEO results?', answer: 'Most businesses see measurable ranking improvements within 60-90 days. Map Pack (Google Maps) rankings often improve faster — within 30-45 days. The key advantage of AI-powered SEO is that optimization is continuous, so improvements compound over time rather than plateauing between consultant visits.' },
        { question: 'What areas do you cover for local SEO?', answer: 'We specialize in Northern California — El Dorado County, Sacramento County, Placer County, Nevada County, and Amador County. However, our AI-powered approach works for any geographic market. The same systems apply whether you serve one city or fifty.' },
        { question: 'Do you build all the location pages for me?', answer: 'Yes. We build programmatic city × service pages automatically from your service list and target geography. A plumber serving 10 cities with 5 services gets 50+ unique, optimized pages — each with original content, FAQs, schema markup, and internal links. All maintained by AI.' },
      ]}
      ctaHeading="Ready to Own Your Local Market?"
      ctaText="Get a free local SEO audit — we'll show you exactly where you rank, where your competitors are beating you, and what AI can fix."
      ctaPrimaryLabel="Get My Free SEO Audit →"
      ctaPrimaryHref="/tools/demand-audit"
      serviceCategory="demand-generation"
    />
      {/* Proof Section */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Local Search Data
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
            Local Search Dominance
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
            Local intent is the highest-converting traffic on the internet. These numbers show why local SEO is non-negotiable for service businesses.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { value: '46%', label: 'Google Searches Are Local' },
              { value: '76%', label: 'Visit Within 24hrs' },
              { value: '28%', label: 'Convert Same Day' },
              { value: '3x', label: 'Leads Avg for Our Clients' },
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
