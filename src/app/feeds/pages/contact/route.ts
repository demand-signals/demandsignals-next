import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const CONTACT_FAQS = [
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

const BOOKING_URL = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true'

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    md = [
      '# Contact Demand Signals',
      '',
      '> Tell us what you need — a website, AI systems, demand generation, or all three. Free strategy calls and quotes for local businesses.',
      '',
      '- **Phone:** (916) 542-2423',
      '- **Email:** DemandSignals@gmail.com',
      '- **Address:** 5170 Golden Foothills Pkwy, El Dorado Hills, CA 95762',
      '- **Hours:** Monday-Friday, 10 AM - 8 PM Pacific',
      `- **Book a Call:** [Schedule](${BOOKING_URL})`,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Contact](${SITE_URL}/contact)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const faqsBlock = CONTACT_FAQS
      .map(f => `### ${f.question}\n\n${f.answer}`)
      .join('\n\n')

    md = [
      '# Contact Demand Signals',
      '',
      '> Tell us what you need — a website, AI systems, demand generation, or all three. We will tell you exactly how we would solve it, what it costs, and how fast we can ship.',
      '',
      '## Contact Information',
      '',
      '- **Phone:** (916) 542-2423',
      '- **Email:** DemandSignals@gmail.com',
      '- **Address:** 5170 Golden Foothills Pkwy, El Dorado Hills, CA 95762',
      '- **Business Hours:** Monday-Friday, 10 AM - 8 PM Pacific Time',
      '',
      '## Book a Free Strategy Call',
      '',
      `Book a free 30-minute strategy call directly on our calendar: [Schedule My Free Call](${BOOKING_URL})`,
      '',
      '- 30 minutes of focused consultation',
      '- No pitch, no pressure — real advice',
      '- Review your current online presence',
      '- Identify the biggest gaps in your local visibility',
      '- Outline what an AI-powered approach looks like for your business',
      '',
      '## Contact Form',
      '',
      `You can also fill out the contact form on our website at [${SITE_URL}/contact](${SITE_URL}/contact). We respond within 1 business hour during Pacific business hours.`,
      '',
      '**Form fields:**',
      '- Name (required)',
      '- Business Name',
      '- Email (required)',
      '- Phone',
      '- Service Interest: Website/Web App, AI Agent Farm, AI Voice System, Workflow Automation, Local Demand Generation, GEO/LLM Optimization, Full Service, Not sure yet',
      '- Message (required)',
      '',
      '## What Happens Next',
      '',
      '1. You submit the form or book a call',
      '2. Our AI intake system processes your request immediately',
      '3. A human strategist reviews your information with full context',
      '4. We respond within 1 business hour during Pacific business hours',
      '5. If you reached out after hours or on weekends, you hear from us first thing the following business day',
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Contact](${SITE_URL}/contact)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  }

  const cached = checkConditional(request, md)
  if (cached) return cached

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
