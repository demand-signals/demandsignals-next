import { buildMetadata } from '@/lib/metadata'
import { getAllPosts } from '@/lib/blog'
import BlogGrid from './BlogGrid'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema } from '@/lib/schema'

const faqs = [
  {
    question: 'What topics does the Demand Signals blog cover?',
    answer: 'Our blog covers AI-powered demand generation, local SEO strategy, GEO and AEO optimization for AI assistant visibility, content automation, reputation management, Google Business Profile optimization, and practical digital strategy for local businesses. Every post is written to provide actionable insight rather than generic advice, with specific tactics that business owners and marketing teams can implement immediately.',
  },
  {
    question: 'Who writes the blog content at Demand Signals?',
    answer: 'Our blog content is produced through a hybrid process — AI content agents draft posts based on real market data, competitive research, and trending search topics, then human strategists review, edit, and refine every piece before publication. This approach ensures we publish at a consistent pace while maintaining the depth, accuracy, and strategic insight that comes from decades of hands-on marketing experience.',
  },
  {
    question: 'How often is new content published?',
    answer: 'We publish new articles on a regular cadence, targeting buyer-intent search terms and emerging topics in AI, demand generation, and local business marketing. Our content calendar is driven by real search demand data and AI citation gap analysis, ensuring every post targets topics that actual business owners are searching for and that AI assistants are being asked about.',
  },
  {
    question: 'Can I use the strategies from your blog posts for my own business?',
    answer: 'Absolutely. Every blog post is designed to be practically useful on its own. We share the same strategies, frameworks, and techniques that we deploy for our clients — from three-layer discovery strategy combining SEO, GEO, and AEO to domain loop architecture and llms.txt optimization. The blog is a demonstration of the kind of thinking and execution we bring to every client engagement.',
  },
  {
    question: 'How can I stay updated on new blog posts and insights?',
    answer: 'You can bookmark our blog page and check back regularly for new content. We also share new posts across our social media channels. If you want personalized insight into how these strategies apply to your specific business, the best next step is to request a free Demand Audit or book a strategy call — we will analyze your market and provide recommendations tailored to your competitive landscape.',
  },
]

export const metadata = buildMetadata({
  title:       'Blog — AI, Demand Generation & Digital Strategy | Demand Signals',
  description: 'Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond.',
  path:        '/blog',
})

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      {/* Dark hero */}
      <section style={{ background: 'var(--dark, #0d0d0d)', color: '#fff', padding: '80px 24px 72px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent, #e8720c)', marginBottom: '16px' }}>
            Demand Signals Blog
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px' }}>
            <span style={{color:'#52C9A0'}}>AI, Demand Generation</span> &amp; <span style={{color:'#FF6B2B'}}>Digital Strategy</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.72)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
            Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond.
          </p>
        </div>
      </section>

      {/* Post grid */}
      <section style={{ background: 'var(--light, #f5f5f3)', padding: '64px 24px 96px' }}>
        <BlogGrid posts={posts} />
      </section>

      {/* FAQ Section */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FAQ</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {faqs.map(faq => (
              <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>{faq.question}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
