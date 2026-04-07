import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Social Media Management — Automated Posting | Demand Signals',
  description: 'AI generates and schedules social media posts across all platforms. 5-7 posts per week, brand voice matched, engagement tracked. Replace your social media manager.',
  path:        '/content-social/ai-social-media-management',
  keywords:    ['AI social media management', 'automated social media', 'social media automation', 'AI social posting'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Social Media"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Social Media</span><br /><span style={{color:'#52C9A0'}}>5-7 Posts Per Week. Zero Employees.</span></>}
      subtitle="AI generates posts across every platform, tailored to your brand voice. Scheduled, published, and tracked automatically. You approve in 10 minutes a week."
      calloutHtml={<>Demand Signals replaces your <span style={{color:'#52C9A0'}}>$3,000+/month social media manager</span> with AI that produces 5-7 posts per week across multiple platforms — because consistent posting drives 67% more leads than businesses that post sporadically, at a fraction of the labor cost.</>}
      ctaLabel="Automate My Social →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Content & Social', path: '/content-social' },
        { name: 'AI Social Media Management', path: '/content-social/ai-social-media-management' },
      ]}
      schemaName="AI Social Media Management"
      schemaDescription="Automated AI social media management with brand voice matching and multi-platform posting."
      schemaUrl="/content-social/ai-social-media-management"
      featuresHeading="5–7 Posts Per Week Across Every Platform — Zero Employees"
      features={[
        { icon: '📣', title: 'Multi-Platform Posting', description: 'LinkedIn, Facebook, Instagram, X, and Google Business — all managed from one system. Content adapted for each platform\'s format and audience.' },
        { icon: '🗓️', title: 'Content Calendar AI', description: 'Monthly calendar planned automatically based on your industry, seasonal trends, and content strategy. No gaps, no \'we\'ll get to it next week.\'' },
        { icon: '🗣️', title: 'Brand Voice Engine', description: 'AI trained on your existing content and brand personality. Posts sound like you, not like a robot. Tone adjusts per platform — professional on LinkedIn, casual on Instagram.' },
        { icon: '📊', title: 'Engagement Tracking', description: 'Likes, shares, comments, reach, and follower growth tracked automatically. Monthly reports show what\'s resonating and what to do more of.' },
        { icon: '🖼️', title: 'Visual Content', description: 'AI generates accompanying images, carousels, and graphics for posts. No need for a separate design tool or graphic designer.' },
        { icon: '✅', title: 'Approval Workflow', description: 'Review upcoming posts in your portal. Approve, edit, or reject with one click. Auto-publish for high-confidence content if you prefer hands-off.' },
      ]}
      stats={[
        { value: 7, suffix: '/wk', label: 'Posts Per Week Automated' },
        { value: 67, suffix: '%', label: 'More Leads from Consistent Social' },
        { value: 5, label: 'Platforms Managed' },
        { value: 3, suffix: 'K+', prefix: '$', label: 'Monthly Savings vs Manager' },
      ]}
      aiCalloutHeading="Replace your $3,000/month social media manager."
      aiCalloutText="A full-time social media manager costs $3,000-4,000/month in salary alone — and produces 3-4 posts per week, sometimes. Our AI produces 5-7 posts per week across multiple platforms, maintains consistent brand voice, tracks engagement, and costs a fraction of a human hire. Better output. Lower cost. Zero sick days."
      faqs={[
        { question: 'Which social media platforms do you manage?', answer: 'LinkedIn, Facebook, Instagram, X (Twitter), and Google Business Profile. We can add other platforms based on your audience. Content is adapted for each platform\'s format and best practices.' },
        { question: 'How does AI match my brand voice?', answer: 'During onboarding, we analyze your existing content, brand guidelines, and communication style. The AI is trained on these inputs and produces content that matches your voice. Over time, it learns from your feedback — approvals, edits, and rejections all improve the voice model.' },
        { question: 'Can I still post my own content alongside the AI content?', answer: 'Absolutely. The AI handles the baseline — consistent, scheduled content that keeps your profiles active. You can post additional content anytime. Many clients post personal updates and behind-the-scenes content while the AI handles educational and promotional content.' },
        { question: 'How does AI-generated social content perform compared to manually created posts?', answer: 'In our deployments, AI-generated posts match or exceed manually created content in engagement metrics because the AI posts consistently and optimizes timing based on when your audience is most active. Manual posting tends to be sporadic — three posts one week, nothing the next. The AI maintains a steady 5-7 posts per week cadence that algorithms reward with better organic reach over time.' },
        { question: 'Does the AI create visual content or just text posts?', answer: 'The AI generates both. Text posts, image captions, carousel copy, and accompanying graphics are all produced as part of the content calendar. For platforms like Instagram where visuals are primary, the AI creates branded graphics, quote cards, and data visualizations that match your brand colors and style guidelines. You do not need a separate design tool or graphic designer.' },
      ]}
      ctaHeading="Ready to Automate Your Social Media?"
      ctaText="We'll audit your current social presence and show you what consistent AI-powered posting can do for your engagement and reach."
      ctaPrimaryLabel="Automate My Social →"
      ctaPrimaryHref="/contact"
      serviceCategory="content-social"

    />
  )
}
