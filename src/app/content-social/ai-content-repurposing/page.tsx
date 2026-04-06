import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Content Republishing — One Piece, Ten Channels | Demand Signals',
  description: 'AI repurposes blog posts into social media, newsletters, LinkedIn articles, GMB posts, and more. Maximize every piece of content across every channel.',
  path:        '/content-social/ai-content-repurposing',
  keywords:    ['content repurposing', 'content republishing', 'multi-channel content', 'content distribution AI'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Content Republishing"
      titleHtml={<><span style={{color:'#FF6B2B'}}>One Piece of Content.</span><br /><span style={{color:'#52C9A0'}}>Ten Channels. Zero Extra Work.</span></>}
      subtitle="AI repurposes your blog posts into social media, email newsletters, LinkedIn articles, GMB posts, and more — maximizing every piece of content you produce."
      calloutHtml={<>Demand Signals turns every piece of content into <span style={{color:'#52C9A0'}}>5-10 format-optimized versions</span> across every channel — because multi-channel content distribution increases audience reach by up to 300%, and repurposed content generates 60% more engagement than single-format publishing.</>}
      ctaLabel="Maximize My Content →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Content & Social', path: '/content-social' },
        { name: 'AI Content Republishing', path: '/content-social/ai-content-repurposing' },
      ]}
      schemaName="AI Content Republishing"
      schemaDescription="Automated content repurposing across social media, email, and web channels."
      schemaUrl="/content-social/ai-content-repurposing"
      featuresHeading="One Input, Ten Outputs"
      features={[
        { icon: '📝', title: 'Blog → Social Media', description: 'Every blog post generates 3-5 social media posts — key takeaways, quotes, statistics, and questions extracted and formatted for each platform.' },
        { icon: '📧', title: 'Blog → Email Newsletter', description: 'Blog content condensed into email-friendly format with compelling subject lines, preview text, and CTAs. Ready to send to your list.' },
        { icon: '💼', title: 'Blog → LinkedIn Article', description: 'Long-form content adapted for LinkedIn\'s algorithm — professional tone, thought leadership positioning, and engagement-optimized formatting.' },
        { icon: '📌', title: 'Blog → GBP Post', description: 'Key insights extracted and formatted as Google Business Profile posts — keeping your GBP active while reinforcing your expertise.' },
        { icon: '🎬', title: 'Blog → Video Scripts', description: 'Content structured as video talking points, scripts, and carousel slides for TikTok, Reels, and YouTube Shorts.' },
        { icon: '📊', title: 'Performance Tracking', description: 'Track which formats and channels drive the most engagement and traffic. AI learns and optimizes the repurposing strategy over time.' },
      ]}
      aiCalloutHeading="Stop creating content for one channel."
      aiCalloutText="The highest-performing businesses maximize every piece of content across every channel. A single blog post should become LinkedIn posts, social media content, email newsletters, GBP posts, and video scripts. Our AI does this automatically — turning your content investment into 5-10x the output."
      faqs={[
        { question: 'Does repurposed content hurt my SEO?', answer: 'No. Each repurposed version is adapted for its specific platform and format — it\'s not duplicate content. A social media post extracted from a blog post is a different format, different length, and different context. Search engines understand the difference.' },
        { question: 'How much content do I need to start?', answer: 'Any amount. If you have existing blog posts, we can start repurposing immediately. If you\'re starting from scratch, we\'ll combine this with our AI Auto Blogging service — AI writes the original content and repurposes it simultaneously.' },
        { question: 'Can I choose which channels to prioritize?', answer: 'Yes. During setup, we identify which channels are most relevant for your audience and business type. A B2B company might prioritize LinkedIn and email. A restaurant might prioritize Instagram and GBP. The AI adapts accordingly.' },
        { question: 'How does the AI adapt content for different platform formats?', answer: 'Each platform has different optimal lengths, tone expectations, and formatting rules. The AI rewrites — not just truncates — your content for each channel. A 1,500-word blog post becomes a punchy 280-character tweet, a professional 300-word LinkedIn article, a visual Instagram caption with hashtags, and a concise GBP update. Each version is native to its platform, not a copy-paste job.' },
        { question: 'How quickly are repurposed versions created after the original publishes?', answer: 'Repurposed content is generated within minutes of the original blog post being approved. Social media versions are queued on a staggered schedule over the following days to maximize reach — typically spreading across 3-5 days rather than dumping everything at once. This cadence keeps your profiles consistently active and avoids overwhelming your audience with the same topic in a single day.' },
      ]}
      ctaHeading="Ready to Maximize Your Content?"
      ctaText="We'll audit your existing content and show you how much more value AI can extract from what you've already created."
      ctaPrimaryLabel="Maximize My Content →"
      ctaPrimaryHref="/contact"
      serviceCategory="content-social"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Distribution Impact
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    One Piece, Ten Channels
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Create once, distribute everywhere, automatically. Content republishing maximizes your investment across every channel.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '300%', label: 'Audience Reach Increase' },
                      { value: '60%', label: 'More Engagement' },
                      { value: '5-10', label: 'Channels per Piece' },
                      { value: '80%', label: 'Time Savings' },
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
