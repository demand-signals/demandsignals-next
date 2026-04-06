import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Content Generation — GEO-First Content | Demand Signals',
  description: 'AI-generated content built to rank in search and get cited by ChatGPT. Blog posts, service pages, FAQs — written by AI, structured for discovery, reviewed by humans.',
  path:        '/content-social/ai-content-generation',
  keywords:    ['AI content generation', 'GEO content', 'AI writing', 'SEO content', 'content marketing AI'],
})

export default function Page() {
  return (
    <>
    <ServicePageTemplate
      eyebrow="AI Content Generation"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Content</span><br /><span style={{color:'#52C9A0'}}>That Ranks and Gets Cited.</span></>}
      subtitle="GEO-first content built to rank in Google AND get cited by ChatGPT, Perplexity, and Gemini. Written by AI, structured for discovery, reviewed by humans."
      calloutHtml={<>Demand Signals structures every piece of content for <span style={{color:'#52C9A0'}}>dual discovery</span> — direct-answer paragraphs, question-format headers, FAQ schema, and citable data. 58.5% of Google searches now end without a click, making AI-citable content structure the difference between being found and being invisible.</>}
      ctaLabel="Start My Content Engine →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Content & Social', path: '/content-social' },
        { name: 'AI Content Generation', path: '/content-social/ai-content-generation' },
      ]}
      schemaName="AI Content Generation"
      schemaDescription="AI-powered content generation optimized for search engines and AI citation."
      schemaUrl="/content-social/ai-content-generation"
      featuresHeading="Content That Works Harder"
      features={[
        { icon: '✍️', title: 'GEO-Structured Writing', description: 'Every piece structured with direct answers first, question-format headers, and extractable content blocks — the format AI engines prioritize for citation.' },
        { icon: '🎯', title: 'Keyword-Driven Topics', description: 'AI analyzes your GSC data and competitor content to identify the topics that will drive the most business — not vanity traffic.' },
        { icon: '🏷️', title: 'Schema Markup Included', description: 'Article, FAQ, HowTo, and Service schema generated automatically for every piece. The structured data search engines and AI need.' },
        { icon: '🗣️', title: 'Brand Voice Matching', description: 'Trained on your existing content and brand guidelines. The AI writes in your voice, not generic AI-speak.' },
        { icon: '✅', title: 'Human Review Workflow', description: 'Every piece goes through your approval portal before publishing. You spend 10 minutes reviewing — AI handles everything else.' },
        { icon: '📈', title: 'Performance Tracking', description: 'Every piece tracked for rankings, traffic, and AI citations. Underperformers get rewritten automatically.' },
      ]}
      aiCalloutHeading="Content that compounds while you sleep."
      aiCalloutText="Traditional content marketing requires hiring writers, managing editorial calendars, and hoping the content ranks. Our AI identifies what to write, writes it in your voice, optimizes it for both Google and AI search, publishes it on schedule, and monitors performance — then rewrites what isn't working. Continuously."
      faqs={[
        { question: 'How does AI content compare to human-written content?', answer: 'When properly structured and reviewed, AI-generated content performs as well or better than human-written content in search. The key is structure — direct answers, question headers, citable data, and schema markup. AI is excellent at producing this consistently. Human review ensures accuracy, brand alignment, and quality control.' },
        { question: 'How much content do you produce per month?', answer: 'Standard packages include 4-8 blog posts, ongoing service page optimization, and FAQ content per month. Volume scales based on your needs and competitive landscape. Every piece is optimized for both traditional SEO and GEO.' },
        { question: 'Will Google penalize AI-generated content?', answer: 'No. Google has explicitly stated they evaluate content quality, not how it was produced. Their guidelines focus on helpfulness, accuracy, and expertise — not whether a human or AI wrote it. Our content meets all of Google\'s E-E-A-T standards because it\'s structured, factual, and reviewed by domain experts.' },
        { question: 'What makes GEO-optimized content different from regular SEO content?', answer: 'GEO content is structured specifically for AI citation — direct-answer opening paragraphs, question-format headers, citable statistics, and FAQ schema markup. Traditional SEO content targets keyword density and backlinks. GEO content targets extractability — making it easy for ChatGPT, Perplexity, and Gemini to pull your content into their answers. The best part is that GEO-structured content also performs well in traditional Google search.' },
        { question: 'How do you ensure content accuracy in specialized industries?', answer: 'The AI generates content based on verified industry data, your business-specific inputs, and domain research. Every piece goes through a human review workflow before publishing — you or a designated team member approve the content in your portal. For regulated industries like healthcare or legal, we flag compliance-sensitive language and recommend review by a licensed professional before publication.' },
      ]}
      ctaHeading="Ready for Content That Generates Demand?"
      ctaText="We'll analyze your current content, identify gaps, and show you what AI-powered content can do for your traffic and leads."
      ctaPrimaryLabel="Start My Content Engine →"
      ctaPrimaryHref="/contact"
      serviceCategory="content-social"
    />
      {/* Proof Section */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Content Performance
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
            Content at Scale
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
            Volume + quality + consistency — AI delivers all three. The data shows why content velocity is the single biggest lever for organic growth.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { value: '58.5%', label: 'Searches End Without a Click' },
              { value: '67%', label: 'More Leads with Content' },
              { value: '6x', label: 'Leads with 400+ Pages' },
              { value: '10x', label: 'AI Volume vs Human' },
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
