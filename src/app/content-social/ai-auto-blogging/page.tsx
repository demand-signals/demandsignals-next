import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Auto Blogging — Weekly Blog Content on Autopilot | Demand Signals',
  description: 'AI researches topics, writes SEO-structured blog posts, and publishes weekly — building your authority and driving organic traffic on autopilot.',
  path:        '/content-social/ai-auto-blogging',
  keywords:    ['AI blogging', 'automated blog content', 'AI blog writing', 'SEO blogging', 'content automation'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Auto Blogging"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Blog Content</span><br /><span style={{color:'#52C9A0'}}>On Autopilot.</span></>}
      subtitle="AI researches topics, writes SEO-structured articles, and publishes them weekly — building your authority and driving organic traffic without you writing a word."
      calloutHtml={<>Demand Signals deploys <span style={{color:'#52C9A0'}}>AI-powered content engines</span> that publish SEO-structured articles on autopilot — because businesses that blog consistently generate 67% more leads per month, and companies with 400+ blog pages get 6x more leads than those with fewer than 100.</>}
      ctaLabel="Start My Blog Engine →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Content & Social', path: '/content-social' },
        { name: 'AI Auto Blogging', path: '/content-social/ai-auto-blogging' },
      ]}
      schemaName="AI Auto Blogging"
      schemaDescription="Automated AI blog content generation with SEO and GEO optimization."
      schemaUrl="/content-social/ai-auto-blogging"
      featuresHeading="Blogging Without the Writing"
      features={[
        { icon: '🔍', title: 'AI Topic Research', description: 'AI analyzes your GSC data, competitor blogs, and industry trends to identify the topics that will drive the most qualified traffic.' },
        { icon: '✍️', title: 'SEO-Structured Writing', description: 'Every post includes proper heading hierarchy, internal links, meta descriptions, and keyword placement. Structured for both Google and AI search.' },
        { icon: '🏷️', title: 'Schema & FAQ Included', description: 'Article schema, FAQ sections, and structured data generated automatically. Every post optimized for featured snippets and AI citation.' },
        { icon: '📅', title: 'Scheduled Publishing', description: 'Posts publish on a consistent weekly schedule. No gaps, no \'we\'ll get to it next week.\' Consistency is what Google rewards.' },
        { icon: '📊', title: 'Performance Monitoring', description: 'Every post tracked for rankings, traffic, and conversions. Underperformers get updated with fresh data and better structure.' },
        { icon: '🔗', title: 'Internal Linking', description: 'AI maintains an internal linking strategy that connects blog content to service pages, location pages, and other posts — distributing authority across your site.' },
      ]}
      aiCalloutHeading="Consistency wins. AI never misses a week."
      aiCalloutText="The businesses that win in organic search are the ones that publish consistently. Most businesses blog for a month, then stop. Our AI publishes every week, every month, without fail. After 6 months, you have 25+ pieces of optimized content compounding authority. After a year, 50+."
      faqs={[
        { question: 'What types of blog posts does the AI write?', answer: 'Primarily buyer-intent content — posts targeting search terms that indicate someone is ready to buy your service. Examples: \'How much does [service] cost in [city]?\', \'Best [service] near [location]\', \'[Service] vs [alternative] — which is better?\' These drive qualified traffic, not vanity visits.' },
        { question: 'How often does the AI publish?', answer: 'Standard packages include 1-2 posts per week. Each post is 1,000-2,000 words, fully optimized with headings, internal links, FAQ sections, and schema markup. Volume can be increased based on your competitive landscape.' },
        { question: 'Do I need to provide topic ideas?', answer: 'No. The AI researches topics automatically based on your industry, target keywords, competitor content, and search trends. However, you can always suggest specific topics through your portal and the AI will prioritize them.' },
        { question: 'How does AI auto blogging help with AI search engines like ChatGPT?', answer: 'Every blog post is structured with direct-answer paragraphs, question-format headings, and FAQ schema markup — the exact signals AI search engines use when selecting sources to cite. Over time, a library of 50+ well-structured posts establishes your site as an authoritative source that ChatGPT, Perplexity, and Gemini consistently reference when answering questions in your industry.' },
        { question: 'Can I edit or reject posts before they publish?', answer: 'Yes. Every post goes through your approval portal where you can approve, edit, or reject with one click. Most clients spend about 5-10 minutes per post reviewing the content. If you prefer a fully hands-off approach, you can enable auto-publish for posts that meet a confidence threshold, and the AI will only flag posts it is less certain about for your review.' },
      ]}
      ctaHeading="Ready for a Blog That Drives Business?"
      ctaText="We'll analyze your industry's content landscape and show you the topics that will drive the most qualified traffic."
      ctaPrimaryLabel="Start My Blog →"
      ctaPrimaryHref="/contact"
      serviceCategory="content-social"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Blogging ROI
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Blogging That Compounds
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Blog content is the compounding interest of digital marketing. Consistent publishing builds authority that pays dividends for years.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '67%', label: 'More Leads with Blogs' },
                      { value: '434%', label: 'More Indexed Pages' },
                      { value: 'Weekly', label: 'Publishing Cadence' },
                      { value: 'SEO', label: 'Structured from Day One' },
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
