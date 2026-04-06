import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'AI Powered Outreach — Automated Prospecting | Demand Signals',
  description: 'AI researches prospects, crafts personalized messages, manages sequences, and routes qualified leads. Personalized outreach at scale.',
  path:        '/ai-services/ai-automated-outreach',
  keywords:    ['AI outreach', 'automated prospecting', 'AI lead generation', 'personalized outreach AI'],
})

export default function Page() {
  return (
    <ServicePageTemplate
      eyebrow="AI Powered Outreach"
      titleHtml={<><span style={{color:'#FF6B2B'}}>AI Outreach</span><br /><span style={{color:'#52C9A0'}}>Personalized at Scale.</span></>}
      subtitle="AI researches prospects, crafts personalized messages, manages multi-step sequences, and routes qualified leads to your sales process. Outreach that feels human, runs like a machine."
      ctaLabel="Automate My Outreach →"
      calloutHtml={<>Demand Signals delivers <span style={{color:'#52C9A0'}}>personalized outreach at scale</span> — our AI-powered sequences achieve 45-65% open rates and 8-15% reply rates, compared to the industry average of 21% open rates for cold email campaigns.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'AI Powered Outreach', path: '/ai-services/ai-automated-outreach' },
      ]}
      schemaName="AI Powered Outreach"
      schemaDescription="Automated AI prospecting with personalized messaging and lead routing."
      schemaUrl="/ai-services/ai-automated-outreach"
      featuresHeading="Outreach That Scales"
      features={[
        { icon: '🔍', title: 'AI Prospect Research', description: 'AI identifies and researches target businesses — website analysis, social presence, tech stack, growth signals, and pain point indicators.' },
        { icon: '✍️', title: 'Personalized Messaging', description: 'Not templates with names swapped. AI crafts genuinely personalized messages based on each prospect\'s specific business, challenges, and opportunities.' },
        { icon: '📧', title: 'Multi-Channel Sequences', description: 'Email, LinkedIn, and follow-up sequences managed automatically. Timing, frequency, and channel optimized based on response patterns.' },
        { icon: '📊', title: 'Lead Scoring', description: 'AI scores prospects based on engagement signals — opens, clicks, replies, website visits. Qualified leads get routed to your sales process automatically.' },
        { icon: '🎯', title: 'A/B Testing', description: 'Subject lines, message angles, CTAs, and timing tested continuously. The system learns what works for your market and optimizes accordingly.' },
        { icon: '📋', title: 'CRM Integration', description: 'Leads, activities, and pipeline data synced with your CRM automatically. No manual data entry, no missed follow-ups.' },
      ]}
      aiCalloutHeading="50 personalized touches per week. Zero manual work."
      aiCalloutText="Traditional outreach requires a person spending hours researching prospects and writing individual emails. Our AI does the same work — but better, faster, and at 10x the volume. Every message is researched and personalized. Every follow-up is timed perfectly. Every qualified lead is routed automatically."
      faqs={[
        { question: 'Isn\'t AI outreach just spam?', answer: 'Not the way we do it. Our AI researches each prospect individually and crafts genuinely personalized messages based on their specific business. It\'s the difference between \'Dear Business Owner\' and \'I noticed your website doesn\'t appear in ChatGPT results for [their service] in [their city] — here\'s what that\'s costing you.\' Quality, not quantity.' },
        { question: 'What response rates do you see?', answer: 'Typical open rates: 45-65%. Reply rates: 8-15%. These are significantly higher than industry averages because every message is researched and personalized. The AI also optimizes timing and channel selection based on your market\'s response patterns.' },
        { question: 'Can I review messages before they send?', answer: 'Yes. You can review and approve every message, or set confidence thresholds for auto-send. Most clients review the first 2-3 weeks of messages, then enable auto-send for messages the AI is highly confident about.' },
        { question: 'How does AI outreach avoid getting flagged as spam?', answer: 'We enforce strict sending limits, warm up new email domains gradually, and rotate sending accounts to maintain healthy sender reputation scores. Each message is genuinely unique — not a template with a name swapped — which keeps spam filters from pattern-matching your outreach. We also monitor deliverability metrics daily and adjust volume or messaging when open rates dip below expected thresholds.' },
        { question: 'How quickly can an AI outreach campaign be launched?', answer: 'Most campaigns go live within 5-7 business days. The first week covers prospect list building, messaging strategy, domain warm-up, and CRM integration. Once the initial sequences are approved, the AI begins sending and optimizing automatically. Clients typically see qualified replies within the first two weeks of active outreach.' },
      ]}
      ctaHeading="Ready for Outreach That Actually Gets Replies?"
      ctaText="We'll build a custom outreach strategy for your market — target audience, messaging angles, and sequence design."
      ctaPrimaryLabel="Design My Outreach →"
      ctaPrimaryHref="/contact"
      serviceCategory="ai-services"
    />
  )
}
