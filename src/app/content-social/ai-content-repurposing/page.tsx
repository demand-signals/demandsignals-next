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
      calloutHtml={<>Most businesses create content once and publish it in one place. We turn every piece into 5-10 format-optimized versions across every channel.</>}
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
      ]}
      ctaHeading="Ready to Maximize Your Content?"
      ctaText="We'll audit your existing content and show you how much more value AI can extract from what you've already created."
      ctaPrimaryLabel="Maximize My Content →"
      ctaPrimaryHref="/contact"
    />
  )
}
