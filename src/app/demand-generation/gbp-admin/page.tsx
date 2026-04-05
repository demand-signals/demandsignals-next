import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Google Business Profile Admin — AI-Managed GBP | Demand Signals',
  description: 'Full Google Business Profile management — posts, photos, Q&A, reviews, and attribute optimization. AI keeps your GBP active and competitive 24/7.',
  path:        '/demand-generation/gbp-admin',
  keywords:    ['Google Business Profile', 'GBP management', 'Google My Business', 'Map Pack optimization', 'GMB admin'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="Google Business Admin"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Google Business Profile</span><br /><span style={{color:'#52C9A0'}}>Always Active. Always Optimized.</span></>}
      subtitle="AI manages your Google Business Profile — weekly posts, photo updates, Q&A responses, review management, and attribute optimization. Your GBP never goes stale."
      calloutHtml={<>Businesses with active GBP profiles receive 7x more clicks than those with incomplete listings. Our AI keeps your profile 100% optimized, 100% of the time.</>}
      ctaLabel="Optimize My GBP →"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Demand Generation', path: '/demand-generation' },
        { name: 'Google Business Profile Management', path: '/demand-generation/gbp-admin' },
      ]}
      schemaName="Google Business Profile Management"
      schemaDescription="AI-managed Google Business Profile optimization including posts, reviews, Q&A, and Map Pack visibility."
      schemaUrl="/demand-generation/gbp-admin"
      featuresHeading="GBP Management, Automated"
      features={[
        { icon: '📌', title: 'Weekly GBP Posts', description: 'AI generates and publishes Google Business posts weekly — updates, offers, events, and tips that keep your profile active and engaging.' },
        { icon: '⭐', title: 'Review Monitoring & Response', description: 'Every review detected within hours. AI drafts professional responses — positive reviews acknowledged, negative reviews handled diplomatically.' },
        { icon: '❓', title: 'Q&A Management', description: 'AI monitors and responds to Google Q&A questions about your business. Proactively seeds common questions with authoritative answers.' },
        { icon: '📸', title: 'Photo Optimization', description: 'Regular photo updates that showcase your work, team, and location. Geotagged, properly categorized, and optimized for local discovery.' },
        { icon: '📊', title: 'Attribute Optimization', description: 'Business attributes, categories, service areas, hours, and descriptions kept accurate and fully populated. Every field that helps you rank — filled and maintained.' },
        { icon: '🗺️', title: 'Map Pack Strategy', description: 'Proximity, relevance, and prominence signals optimized to push your business into the Google Maps 3-pack for your target searches.' },
      ]}
      aiCalloutHeading="Your GBP never sleeps. Neither does our AI."
      aiCalloutText="Most businesses post to their Google Business Profile once, then forget about it. Ours posts weekly, responds to every review, answers every question, and keeps every attribute updated. The result: a profile that Google rewards with better Map Pack positioning."
      faqs={[
        { question: 'How important is Google Business Profile for local businesses?', answer: 'Critical. GBP drives Map Pack visibility — the local 3-pack that appears at the top of location-based searches. Businesses with active, optimized GBP profiles receive significantly more calls, direction requests, and website visits than those with bare or inactive profiles.' },
        { question: 'Can I still manage my own GBP while you handle the rest?', answer: 'Absolutely. We handle the ongoing optimization — posts, review responses, Q&A, attributes — but you retain full access to your profile. You can post, respond, and update anything at any time. We just ensure nothing falls through the cracks.' },
        { question: 'How do you handle negative reviews?', answer: 'AI drafts a professional, empathetic response that acknowledges the concern without being defensive. You can review and approve the response before it publishes, or enable auto-publish for responses the AI is highly confident about. The goal is always to demonstrate professionalism to future readers.' },
        { question: 'How do GBP posts differ from regular social media posts?', answer: 'Google Business Profile posts appear directly in your business listing on Google Search and Maps — reaching people who are actively searching for your services, not scrolling a social feed. GBP posts support offers, events, updates, and product highlights with direct call-to-action buttons. Our AI writes posts specifically optimized for GBP format, including relevant keywords that reinforce your local search relevance.' },
        { question: 'What GBP attributes and categories matter most for ranking?', answer: 'Primary category selection is the single most important GBP ranking factor — it must exactly match your core service. Secondary categories, service descriptions, business attributes (accessibility, payment methods, amenities), and service area definitions all contribute to relevance signals. Our AI audits every available field and keeps them fully populated and accurate, because incomplete profiles consistently lose Map Pack positioning to fully optimized competitors.' },
      ]}
      ctaHeading="Ready for a GBP That Works for You?"
      ctaText="We'll audit your current Google Business Profile and show you exactly what's missing and what's costing you visibility."
      ctaPrimaryLabel="Audit My GBP →"
      ctaPrimaryHref="/tools/demand-audit"
    />
  )
}
