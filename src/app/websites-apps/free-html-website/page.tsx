import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'
import { AdminHoursPackages } from '@/components/sections/AdminHoursPackages'

export const metadata = buildMetadata({
  title:       'Free HTML Websites for Small Business — $20/mo Hosting | Demand Signals',
  description: 'Free hand-coded HTML websites for small businesses in Sacramento, El Dorado Hills, Folsom, Roseville. AI generates the content, we ship in days. You only pay $20/mo for Verpex PHP hosting.',
  path:        '/websites-apps/free-html-website',
  keywords:    ['free website small business', 'free HTML website', 'free website builder Sacramento', 'free small business website', 'free website for my business', 'free site El Dorado Hills'],
})

export default function FreeHtmlWebsitePage() {
  return (
    <>
    <ServicePageTemplate
      eyebrow="Free HTML Website"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Free Websites</span> for<br /><span style={{color:'#52C9A0'}}>Small Businesses.</span></>}
      subtitle="Free hand-coded HTML site for your small business. AI generates content, we ship in days. You only pay $20/mo for hosting — and a real human handles updates whenever you need them."
      ctaLabel="Get My Free Site →"
      ctaHref="/quote"
      calloutHtml={<>We build your site free because most {''}<span style={{color:'#52C9A0'}}>small businesses eventually need help</span>{' '}— content updates, new pages, SEO improvements, or a tier-up to WordPress. Free site, real long-term partnership. Serving Sacramento, El Dorado Hills, Folsom, Roseville, Granite Bay, Auburn, Cameron Park, and Northern California.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'Free HTML Website', path: '/websites-apps/free-html-website' },
      ]}
      schemaName="Free HTML Website Build"
      schemaDescription="Free hand-coded HTML website for small businesses with AI-generated content and $20/mo Verpex PHP hosting."
      schemaUrl="/websites-apps/free-html-website"
      featuresHeading="What's Included — Free"
      features={[
        { icon: '🌐', title: 'Free Build, No Catch', description: 'The labor is free. We use AI to research your business, write the copy, and hand-code a fast HTML site. No setup fee, no design fee, no contract — just $20/mo hosting after launch.' },
        { icon: '🏎️', title: 'Sub-Second Load Times', description: 'Hand-coded HTML loads faster than any page builder. No bloated JavaScript, no plugin overhead — just clean, semantic markup that Google and AI search engines love.' },
        { icon: '🤖', title: 'AI-Generated Content', description: 'Our AI researches your business, your competitors, your local market, and writes copy that targets the searches your customers actually do. Reviewed by a human before launch.' },
        { icon: '📍', title: 'Local SEO Built In', description: 'Schema markup for your business, Google Business Profile alignment, location-targeted page structure. We set you up to show up in the Map Pack from day one.' },
        { icon: '📱', title: 'Mobile-Responsive Default', description: 'Looks great on every device, every browser. Google measures mobile-first, so we build mobile-first. 65% of local searches happen on phones — we capture them.' },
        { icon: '🛠️', title: 'Admin Hours Add-On', description: 'When you need updates, pay $50/hr as you go OR get 4 hours/$100/mo, 8 hours/$200/mo, 20 hours/$500/mo, or 40 hours/$1,000/mo with our Admin Hours packages.' },
      ]}
      stats={[
        { value: 0, prefix: '$', label: 'Build cost' },
        { value: 20, prefix: '$', suffix: '/mo', label: 'Hosting (Verpex PHP)' },
        { value: 5, suffix: '–10 days', label: 'Typical launch time' },
        { value: 100, suffix: '%', label: 'Code ownership — yours' },
      ]}
      techStack={[
        { label: 'Stack', value: 'Hand-coded HTML, CSS, vanilla JS' },
        { label: 'Hosting', value: 'Verpex PHP shared hosting' },
        { label: 'CDN', value: 'Cloudflare (included)' },
        { label: 'SSL', value: 'Automatic, free, renewed forever' },
        { label: 'Backups', value: 'Daily, retained 30 days' },
        { label: 'Content engine', value: 'Claude API + human review' },
      ]}
      aiCalloutEyebrow="The AI Content Loop"
      aiCalloutHeading="We Don't Charge for Content Writing"
      aiCalloutText="Most agencies bill $50–200/page for content. We use AI to generate it as part of the free build. You review, we revise, we ship — at no cost to you."
      aiCalloutBullets={[
        'AI researches your industry, location, and competitors',
        'AI drafts page copy targeting buyer-intent searches',
        'Human edits for tone, accuracy, and your brand voice',
        'Ongoing edits via Admin Hours packages (optional)',
      ]}
      faqs={[
        { question: 'Is the free website really free?', answer: 'Yes — the build is genuinely free. We use AI to research your business, generate copy, and hand-code a fast HTML site. You pay $20/month for hosting on our Verpex PHP infrastructure (SSL, backups, security included). No setup fee, no design fee, no contract.' },
        { question: 'Why would a marketing agency give away free websites?', answer: 'Because most small businesses eventually need help — content updates, new pages, SEO improvements, or a tier-up to WordPress when they outgrow a static site. We earn through hosting, Admin Hours retainers, and the natural upgrade path as your business grows. Free site, real long-term partnership.' },
        { question: 'How fast can you launch my free site?', answer: 'Most free HTML sites launch within 5–10 business days from quote acceptance. If your business is already in Google Business Profile or has an existing website we can mirror, we ship faster. The AI handles content generation; our team handles design, schema markup, and local SEO setup.' },
        { question: 'Do I own the site?', answer: 'Yes. The code is yours; you can take it with you anytime. We do ask for 30 days notice on hosting cancellation so we can hand off cleanly.' },
        { question: 'What about updates after launch?', answer: 'Two options. Pay-as-you-go at $50/hr (15-min increments) — good for one-off tweaks. Or one of our Admin Hours packages from $100/mo for 4 hours, up to $1,000/mo for 40 hours — better if you need ongoing changes. Unused hours expire monthly. Marketing campaigns, newsletters, and SEO content writing are separate services.' },
        { question: 'Can I update content myself?', answer: 'Yes — we can include a simple admin dashboard so you can edit text, swap photos, and update business hours yourself. More complex changes (adding pages, design tweaks) go through Admin Hours.' },
        { question: 'When should I upgrade to WordPress?', answer: 'Free HTML works perfectly for a 1–10 page brochure site that doesn\'t change often. Upgrade to WordPress w/ Divi (starting at $2,000) when you need a blog, e-commerce, member areas, or want non-technical staff editing visually. We credit any unused Admin Hours toward the new build.' },
        { question: 'How do I get started?', answer: 'Run our 5-minute AI quote — it researches your business, proposes a scope, and lets you book a call to confirm. We deliver your free site within 5–10 business days of acceptance.' },
      ]}
      ctaHeading="Ready for Your Free Website?"
      ctaText="Get a 5-minute AI quote that researches your business, proposes a scope, and books a 15-minute call. Most free sites launch within 5–10 business days of acceptance."
      ctaPrimaryLabel="Get My Free Site →"
      ctaPrimaryHref="/quote"
      ctaSecondaryLabel="See WordPress Tier"
      ctaSecondaryHref="/websites-apps/wordpress-website"
    />
    <AdminHoursPackages
      eyebrow="After your site launches"
      heading="Admin Hours — Optional Updates & Iteration"
      intro="Your free site is free forever. When you need content updates, new pages, or a design tweak — pick an Admin Hours package (or pay-as-you-go). Unused hours expire each month so we both stay busy."
    />
    </>
  )
}
