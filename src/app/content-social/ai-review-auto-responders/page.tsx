import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Review Auto Responders — Every Review Handled | Demand Signals',
  description: 'AI monitors and responds to every Google review within hours. Positive reviews acknowledged, negative reviews handled professionally. Every review. Every time.',
  path:        '/content-social/ai-review-auto-responders',
  keywords:    ['AI review responses', 'review management', 'Google review automation', 'reputation management AI'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Review Responders"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Every Review Handled.</span><br /><span style={{color:'#52C9A0'}}>Within Hours, Not Days.</span></>}
      subtitle="AI monitors every Google review, drafts professional responses, and publishes them — positive reviews acknowledged, negative reviews handled diplomatically. Every review. Every time."
      calloutHtml={<>Businesses that respond to reviews within 24 hours see 33% higher customer satisfaction scores. Our AI responds within hours.</>}
      ctaLabel="Handle My Reviews →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Content & Social', path: '/content-social' },
        { name: 'AI Review Auto Responders', path: '/content-social/ai-review-auto-responders' },
      ]}
      schemaName="AI Review Auto Responders"
      schemaDescription="Automated AI review monitoring and response system for Google reviews."
      schemaUrl="/content-social/ai-review-auto-responders"
      featuresHeading="Review Management, Automated"
      features={[
        { icon: '🔔', title: 'Instant Detection', description: 'New reviews detected within hours across Google, Yelp, and industry-specific platforms. No review goes unnoticed.' },
        { icon: '🧠', title: 'Sentiment Analysis', description: 'AI classifies each review by sentiment and urgency. Positive reviews get acknowledged. Negative reviews get flagged for careful handling.' },
        { icon: '✍️', title: 'Professional Responses', description: 'AI drafts thoughtful, personalized responses — not generic templates. Each response addresses the specific feedback in the review.' },
        { icon: '🚨', title: 'Critical Review Alerts', description: 'Reviews with serious concerns or potential PR issues get escalated to you immediately with a suggested response and recommended action.' },
        { icon: '✅', title: 'Auto-Publish Option', description: 'Enable auto-publish for positive review responses where AI confidence is high. Approve manually only when needed.' },
        { icon: '📊', title: 'Rating Trend Tracking', description: 'Track your average rating, review volume, sentiment trends, and response time over time. See how reputation management impacts your business.' },
      ]}
      aiCalloutHeading="Reputation management that never takes a day off."
      aiCalloutText="Most businesses either ignore reviews or respond days later with generic copy-paste replies. Neither helps. Our AI responds within hours with thoughtful, specific responses that show future customers you care. Every review. Every time. No exceptions."
      faqs={[
        { question: 'Can AI really write good review responses?', answer: 'Yes — and often better than rushed human responses. AI has unlimited time to craft thoughtful, professional, non-defensive replies. It addresses specific feedback, thanks reviewers by context, and handles criticism diplomatically. Every response is reviewable before publishing if you prefer manual approval.' },
        { question: 'What about negative or fake reviews?', answer: 'Negative reviews get flagged with higher urgency. AI drafts a professional response that acknowledges the concern without being defensive, and alerts you immediately. For suspected fake reviews, we help you file removal requests through Google\'s proper channels.' },
        { question: 'Which review platforms do you monitor?', answer: 'Google Business Profile reviews are the primary focus since they directly impact local rankings. We also monitor Yelp, Facebook, and industry-specific platforms based on your business type.' },
        { question: 'How does responding to reviews impact local search rankings?', answer: 'Google has confirmed that review activity — including response rate and recency — is a factor in local search rankings. Businesses that respond to every review signal active management, which Google rewards with better Map Pack positioning. Our AI ensures a 100% response rate with fast turnaround, which is a measurable ranking advantage over competitors who ignore or delay their review responses.' },
        { question: 'Can the AI match my brand voice when responding to reviews?', answer: 'Yes. During onboarding, we analyze your existing communications, brand tone, and preferred response style. The AI is trained on these inputs so responses sound authentically like your business — whether that is warm and casual or formal and professional. Over time, the model improves based on your edits and approvals, getting closer to your exact voice with every review cycle.' },
      ]}
      ctaHeading="Ready for Every Review Handled Professionally?"
      ctaText="We'll audit your current review response rate and show you how AI can handle them all — faster and more consistently."
      ctaPrimaryLabel="Handle My Reviews →"
      ctaPrimaryHref="/contact"
    />
  )
}
