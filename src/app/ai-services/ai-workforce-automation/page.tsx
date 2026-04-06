import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Workforce Automation — Replace Roles, Not People | Demand Signals',
  description: 'Replace specific, expensive, inconsistent business roles with AI systems that cost less and perform better. Content, social, reviews, SEO — all automatable.',
  path:        '/ai-services/ai-workforce-automation',
  keywords:    ['AI workforce automation', 'AI role replacement', 'business automation AI', 'reduce labor costs AI'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Workforce Automation"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Replace the Role.</span><br /><span style={{color:'#52C9A0'}}>Not the Person.</span></>}
      subtitle="AI systems that handle specific business functions — content creation, social media, review management, SEO, data entry — at a fraction of the cost of human labor."
      calloutHtml={<>The pitch is simple: replace the people and agencies doing manual marketing work with AI systems that cost less and perform better. We&apos;ve done it across every industry.</>}
      ctaLabel="Automate My Workforce →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'AI Workforce Automation', path: '/ai-services/ai-workforce-automation' },
      ]}
      schemaName="AI Workforce Automation"
      schemaDescription="AI systems replacing specific business roles and functions."
      schemaUrl="/ai-services/ai-workforce-automation"
      featuresHeading="What AI Replaces Today"
      features={[
        { icon: '📣', title: 'Social Media Manager', description: '$3,000+/month salary → AI posts 5-7 times per week across all platforms. Better consistency, more volume, fraction of the cost.' },
        { icon: '✍️', title: 'Content Writer', description: '$1,500-3,000/month → AI researches, writes, and publishes SEO-structured content weekly. GEO-optimized, schema-marked, human-reviewed.' },
        { icon: '⭐', title: 'Reputation Manager', description: '$300-500/month service → AI responds to every review within hours. Professional, personalized, never misses one.' },
        { icon: '🔍', title: 'SEO Consultant', description: '$1,000-3,000/month → AI monitors rankings daily, identifies opportunities, and rewrites underperforming pages automatically.' },
        { icon: '📋', title: 'Marketing Coordinator', description: '$3,500+/month salary → AI plans content calendars, generates assets, schedules posts, and reports performance. No PTO, no turnover.' },
        { icon: '📧', title: 'Outreach Specialist', description: '$2,000-4,000/month → AI researches prospects, personalizes messages, manages sequences, and routes qualified leads.' },
      ]}
      aiCalloutHeading="The math is simple."
      aiCalloutText="A social media manager + content writer + reputation service + SEO consultant = $8,000-10,000/month in human labor. Our AI systems handle all four functions for $1,400-3,500/month. Same or better output. 60-85% cost reduction. Zero sick days, zero turnover, zero management overhead."
      faqs={[
        { question: 'Which roles can AI realistically replace in 2026?', answer: 'Marketing and content roles are the highest-ROI targets: social media management, content writing, review response, SEO monitoring, email marketing, and basic customer service. We\'ve successfully automated all of these across our client deployments.' },
        { question: 'What about quality? Can AI really match human performance?', answer: 'For structured, repeatable tasks — yes, and often better. AI produces content more consistently, responds to reviews faster, monitors data more thoroughly, and never has an off day. The key is human oversight for quality control, which requires about 10-15 minutes per week.' },
        { question: 'Will this eliminate jobs at my company?', answer: 'That\'s your decision. Some clients use AI to replace roles they were paying agencies for. Others use it to augment existing staff — freeing humans for high-value work while AI handles the repetitive tasks. We help you make the right call based on your specific situation.' },
        { question: 'How long does it take to see cost savings from workforce automation?', answer: 'Most clients see measurable savings within the first 30 days. Content and social media automation deliver immediate output, so you can reduce agency spend or reallocate staff in the first month. Full ROI — including search ranking improvements and lead generation gains — typically materializes over 60-90 days as the AI systems build momentum and compound results.' },
        { question: 'What level of human oversight is required once AI replaces a role?', answer: 'About 10-15 minutes per week per function. You review AI-generated content in an approval portal, check performance dashboards, and flag anything that needs adjustment. The AI handles research, creation, publishing, and monitoring autonomously. Think of it as managing an employee who does 95% of the work and only needs your sign-off on the remaining 5%.' },
      ]}
      ctaHeading="Ready to See What AI Can Replace?"
      ctaText="We'll audit your current marketing spend and show you exactly which roles AI can handle — and the monthly savings."
      ctaPrimaryLabel="Get My Workforce Audit →"
      ctaPrimaryHref="/tools/demand-audit"
      serviceCategory="ai-services"
    />
  )
}
