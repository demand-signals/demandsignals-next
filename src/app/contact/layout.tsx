import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title: 'Contact Demand Signals — Start the Conversation',
  description: 'Contact Demand Signals. Book a free strategy call or send a message. AI-powered websites and demand generation for businesses across the USA and beyond.',
  path: '/contact',
  keywords: ['contact Demand Signals', 'book a call', 'AI marketing consultation', 'free strategy call', 'demand generation quote'],
})

const contactFaqs = [
  {
    question: 'How quickly will I hear back after submitting the contact form?',
    answer: 'We respond to every inquiry within one business hour during Pacific business hours (Monday through Friday, 8 AM to 6 PM). If you reach out over the weekend or after hours, you will hear from us first thing the following business day. Our AI intake system processes your request immediately so our team has full context before responding.',
  },
  {
    question: 'What should I expect on a free strategy call?',
    answer: 'Our strategy calls are 30 minutes of focused, no-pitch consultation. We review your current online presence, identify the biggest gaps in your local visibility, and outline what an AI-powered approach would look like for your specific business. You will walk away with actionable insights whether you work with us or not.',
  },
  {
    question: 'Do I need to know what service I need before reaching out?',
    answer: 'Not at all. Many of our clients come to us knowing they need more leads but unsure which services will get them there. Select "Not sure yet" on the form and describe your situation — our team will recommend the right combination of AI marketing, web development, or automation based on your goals and budget.',
  },
  {
    question: 'Is there any cost or commitment to contacting Demand Signals?',
    answer: 'There is zero cost and zero obligation. The contact form, strategy call, and initial audit are all completely free. We believe in earning your business by demonstrating value upfront. You will never be pressured into a contract or upsold during your initial consultation.',
  },
  {
    question: 'Can I request a proposal for multiple services at once?',
    answer: 'Absolutely. Most of our clients benefit from a bundled approach — combining an AI-powered website with local SEO, content generation, and review management. Mention everything you are interested in on the form or during your call, and we will build a unified proposal with clear pricing for each component.',
  },
]

const contactPointSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Demand Signals',
  description: 'Get in touch with Demand Signals for AI-powered websites, demand generation, and marketing automation.',
  url: 'https://demandsignals.co/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'Demand Signals',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-916-542-2423',
      email: 'DemandSignals@gmail.com',
      contactType: 'sales',
      availableLanguage: 'English',
      areaServed: 'US',
    },
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={contactPointSchema} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Contact', url: 'https://demandsignals.co/contact' },
      ])} />
      <JsonLd data={faqSchema(contactFaqs)} />
      {children}
    </>
  )
}
