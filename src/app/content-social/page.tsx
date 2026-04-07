import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'AI Content & Social Media Management | Demand Signals',
  description: 'AI content generation, social media management, review auto-responders, and auto-blogging. Replace your content team with AI that runs 24/7.',
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
    question: 'How much content can AI actually produce without losing quality?',
    answer: 'At scale, our AI content systems produce 30–50 pieces of content per month per client — blog posts, social updates, GBP posts, review responses, and email sequences — all reviewed for brand voice and accuracy before publishing. Quality is enforced through editorial guidelines, brand voice profiles, and human review checkpoints. Volume without quality is noise; we do both.',
  },
  {
    question: 'Will AI-generated content hurt my search rankings?',
    answer: 'Not when it\'s done correctly. Google\'s guidelines target low-quality, spammy content — not AI-assisted content that is accurate, helpful, and well-structured. Our content is researched with real data, written to match your brand voice, reviewed by a human strategist, and optimized with proper headings, schema, and internal linking. It performs as well or better than content produced manually.',
  },
  {
    question: 'How does AI manage social media without sounding robotic?',
    answer: 'We build a detailed brand voice profile for every client — tone, vocabulary, topics to lean into, topics to avoid, and examples of content you love. Our AI uses this profile to generate social content that sounds like you, not like a chatbot. A human reviewer approves anything that goes out under your name, so nothing reaches your audience without passing a quality check.',
  },
  {
    question: 'What is AI review auto-responding and how does it protect my reputation?',
    answer: 'Our review management system monitors new reviews across Google, Yelp, Facebook, and other platforms in real time. When a review comes in, an AI drafts a professional, brand-appropriate response within minutes. Positive reviews get personalized thanks. Negative reviews get calm, solution-oriented replies designed to demonstrate responsiveness. A human approves all responses before they post, or you can approve them yourself through a simple dashboard.',
  },
  {
    question: 'How often will content be published across my channels?',
    answer: 'Publication frequency is set based on your goals and channels. A standard content package typically includes 4–8 blog posts per month, daily or near-daily social media posts, 4 GBP posts per month, and real-time review responses. Higher-tier packages include video scripts, email sequences, and content repurposing across multiple formats from each primary piece.',
  },
]

export default function ContentSocialPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="Content & Social"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI Content & Social</span> — <span style={{color:'#FF6B2B'}}>Replace Your Content Team.</span></>}
      subtitle="AI writes your content, manages your social media, responds to your reviews, and publishes your blog — 24/7, at a fraction of the cost of a marketing coordinator."
      calloutHtml={<>Your content engine <span style={{color:'#52C9A0'}}>never sleeps, never runs dry</span>, and never misses a post — so you stay top of mind with customers while you focus on running your business.</>}
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="Content & Social"
      breadcrumbPath="/content-social"
    />
  )
}
