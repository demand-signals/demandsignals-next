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
    <>
    <ServicePageTemplate
      eyebrow="AI Workforce Automation"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Replace the Role.</span><br /><span style={{color:'#52C9A0'}}>Not the Person.</span></>}
      subtitle="AI systems that handle specific business functions — content creation, social media, review management, SEO, data entry — at a fraction of the cost of human labor."
      calloutHtml={<>Demand Signals replaces manual marketing roles with <span style={{color:'#52C9A0'}}>AI systems that cost 60-85% less</span> and perform better — a social media manager + content writer + SEO consultant typically costs $8,000-10,000/month in human labor. Our AI handles all three for $1,400-3,500/month.</>}
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
      {/* Proof Section */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Cost Comparison
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
            The Replacement Math
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
            AI does not replace your best people. It replaces the roles you overpay for. The numbers speak for themselves.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { value: '60-85%', label: 'Cost Reduction' },
              { value: '$8-10K', label: 'Human Team per Month' },
              { value: '$1.4-3.5K', label: 'AI Replacement Cost' },
              { value: '24/7', label: 'Continuous Operation' },
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
