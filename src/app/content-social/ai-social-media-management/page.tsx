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
      featuresHeading="Social Media, Automated"
      features={[
        { icon: '📣', title: 'Multi-Platform Posting', description: 'LinkedIn, Facebook, Instagram, X, and Google Business — all managed from one system. Content adapted for each platform\'s format and audience.' },
        { icon: '🗓️', title: 'Content Calendar AI', description: 'Monthly calendar planned automatically based on your industry, seasonal trends, and content strategy. No gaps, no \'we\'ll get to it next week.\'' },
        { icon: '🗣️', title: 'Brand Voice Engine', description: 'AI trained on your existing content and brand personality. Posts sound like you, not like a robot. Tone adjusts per platform — professional on LinkedIn, casual on Instagram.' },
        { icon: '📊', title: 'Engagement Tracking', description: 'Likes, shares, comments, reach, and follower growth tracked automatically. Monthly reports show what\'s resonating and what to do more of.' },
        { icon: '🖼️', title: 'Visual Content', description: 'AI generates accompanying images, carousels, and graphics for posts. No need for a separate design tool or graphic designer.' },
        { icon: '✅', title: 'Approval Workflow', description: 'Review upcoming posts in your portal. Approve, edit, or reject with one click. Auto-publish for high-confidence content if you prefer hands-off.' },
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
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Social Media ROI
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Social on Autopilot
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Consistent social presence without the headcount. AI handles the volume while you approve the quality.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '5-7', label: 'Posts/Week Automated' },
                      { value: '67%', label: 'More Leads from Social' },
                      { value: '3', label: 'Platforms Managed' },
                      { value: '$3K+/mo', label: 'Savings vs Human Manager' },
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
