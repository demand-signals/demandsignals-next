import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'Content & Social — AI Content Generation & Social Media | Demand Signals',
  description: 'AI-powered content generation, social media management, review auto-responders, auto-blogging, and content repurposing. Replace your content team with AI systems that run 24/7.',
  path:        '/content-social',
  keywords:    ['AI content generation', 'AI social media management', 'automated review responses', 'AI blogging', 'content repurposing', 'social media automation'],
})

const SERVICES = [
  {
    icon: '✍️',
    href: '/content-social/ai-content-generation',
    title: 'AI Content Generation',
    description: 'GEO-first content built to rank in search and get cited by AI. Blog posts, service pages, landing pages, and FAQs — written by AI, structured for discovery, reviewed by humans.',
    features: ['GEO-optimized content', 'SEO-structured writing', 'Brand voice matching', 'Human review workflow'],
  },
  {
    icon: '📣',
    href: '/content-social/ai-social-media-management',
    title: 'AI Social Media Management',
    description: 'AI generates posts across every platform, tailored to your brand voice. 5-7 posts per week, scheduled automatically. You approve in 10 minutes — AI handles everything else.',
    features: ['Multi-platform posting', 'Brand voice AI', 'Content calendar automation', 'Engagement tracking'],
  },
  {
    icon: '⭐',
    href: '/content-social/ai-review-auto-responders',
    title: 'AI Review Auto Responders',
    description: 'Every Google review responded to within hours — positive reviews acknowledged, negative reviews handled professionally. AI drafts, you approve (or auto-publish high-confidence responses).',
    features: ['Instant review detection', 'Sentiment analysis', 'Professional responses', 'Auto-publish option'],
  },
  {
    icon: '📝',
    href: '/content-social/ai-auto-blogging',
    title: 'AI Auto Blogging',
    description: 'Weekly blog content targeting the search terms that drive business. AI researches topics, writes SEO-structured articles, and publishes them — building your authority on autopilot.',
    features: ['Topic research AI', 'SEO-structured articles', 'Automatic publishing', 'Authority building'],
  },
  {
    icon: '🔄',
    href: '/content-social/ai-content-repurposing',
    title: 'AI Content Republishing',
    description: 'One piece of content becomes ten. AI repurposes blog posts into social media, email newsletters, LinkedIn articles, GMB posts, and more — maximizing every piece you produce.',
    features: ['Blog → social media', 'Cross-platform adaptation', 'Format optimization', 'Consistent messaging'],
  },
]

const FAQS = [
  {
    question: 'How does AI content generation maintain my brand voice?',
    answer: 'We train our AI systems on your existing content, brand guidelines, and tone preferences during onboarding. The AI produces drafts that match your voice, and everything goes through an approval workflow — you review and approve in your portal before anything publishes. Over time, the AI learns from your feedback and gets more aligned with your brand.',
  },
  {
    question: 'What does AI content generation replace in terms of cost?',
    answer: 'A social media manager costs $3,000+/month and produces 3-4 posts per week. A content writer costs $1,500-3,000/month. A reputation management service costs $300-500/month. Our AI content systems handle all three functions for $800-2,500/month depending on volume — better output, lower cost, zero sick days.',
  },
  {
    question: 'Can AI really write content that ranks in Google?',
    answer: 'Yes — when structured correctly. The key isn\'t just generating words. Our AI produces content with direct-answer structure, question-format headers, FAQ schema, and citable data — the specific signals that both Google and AI search engines prioritize. Every piece is optimized for both traditional SEO and GEO (Generative Engine Optimization).',
  },
  {
    question: 'How much of my time does this require per week?',
    answer: 'About 10 minutes. You log into your portal, review upcoming posts and content drafts, approve or request changes, and you\'re done. The AI handles research, writing, scheduling, publishing, and performance tracking. Your job is quality control — the AI does everything else.',
  },
]

export default function ContentSocialPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="Content & Social"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI Content & Social</span> — <span style={{color:'#FF6B2B'}}>Replace Your Content Team.</span></>}
      subtitle="AI writes your content, manages your social media, responds to your reviews, and publishes your blog — 24/7, at a fraction of the cost of a marketing coordinator."
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="Content & Social"
      breadcrumbPath="/content-social"
    />
  )
}
