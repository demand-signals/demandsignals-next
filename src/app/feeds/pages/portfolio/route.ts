import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const CLIENTS = [
  { name: 'Placerville Animal Surgery Center', industry: 'Veterinary / Medical', description: 'Full website build, AI-powered booking integration, and local SEO for a specialty surgical practice in Placerville, CA.' },
  { name: 'Sierra Nevada Roofing', industry: 'Contractor & Construction', description: 'Local demand generation campaign, GMB optimization, and AI lead qualification system for a regional roofing contractor.' },
  { name: 'Gold Country Dental', industry: 'Medical & Wellness', description: 'New patient acquisition funnel, schema optimization, and AI voice intake system for a multi-location dental practice.' },
  { name: 'Foothills Family Law', industry: 'Legal & Professional', description: 'GEO/LLM optimization to drive AI citation visibility, plus automated client intake and document workflows.' },
  { name: 'Lake Tahoe Boat Rentals', industry: 'Auto & Marine', description: 'Seasonal demand calendar, PPC-ready keyword mapping, and a booking-optimized landing page system.' },
  { name: 'El Dorado Physical Therapy', industry: 'Medical & Wellness', description: 'AI voice receptionist, appointment scheduling automation, and local SEO for a private PT clinic.' },
  { name: 'Granite Bay Realty Group', industry: 'Real Estate', description: 'Market demand analysis, competitor intelligence report, and content strategy for a regional real estate brokerage.' },
  { name: 'Auburn Craft Distillery', industry: 'Food & Beverage', description: 'Brand awareness campaign, social content calendar, and event-driven demand generation for a local spirits brand.' },
  { name: 'Sacramento Valley CrossFit', industry: 'Fitness & Sports', description: 'Lead magnet funnel, email automation, and local search visibility overhaul for a CrossFit affiliate gym.' },
  { name: 'Nevada City Med Spa', industry: 'Health & Beauty', description: 'AEO optimization for voice search, AI booking assistant, and a full GEO citation strategy.' },
  { name: 'Folsom Auto Glass', industry: 'Auto & Marine', description: 'Emergency service demand capture system, Google LSA management, and review generation automation.' },
  { name: 'Camino Hardware & Supply', industry: 'Specialty Retail', description: 'Local inventory SEO, product schema optimization, and competitor gap analysis for a family-owned hardware store.' },
  { name: 'Roseville Learning Center', industry: 'Education', description: 'Enrollment funnel, content marketing strategy, and AI tutoring assistant integration for a private learning center.' },
  { name: 'Grass Valley Plumbing Co.', industry: 'Contractor & Construction', description: 'Emergency demand capture, AI voice receptionist for after-hours calls, and Google Maps ranking campaign.' },
]

const PORTFOLIO_FAQS = [
  {
    question: 'What types of businesses has Demand Signals worked with?',
    answer: 'We have worked with businesses across a wide range of industries including veterinary and medical practices, dental offices, law firms, roofing and construction contractors, real estate brokerages, fitness studios, restaurants and craft beverage brands, auto service businesses, retail stores, and education centers. Our AI-powered systems are designed to be industry-agnostic, adapting to the specific competitive landscape and customer behavior of each market.',
  },
  {
    question: 'What kind of results can I expect from working with Demand Signals?',
    answer: 'Results vary by industry and starting point, but our engagements typically focus on measurable outcomes: improved search visibility for high-intent local keywords, increased Google Maps rankings, enhanced AI citation status across ChatGPT, Gemini, and Perplexity, automated lead capture and qualification, and streamlined operations through AI voice and booking systems. Every engagement begins with a baseline audit so progress is tracked against real data.',
  },
  {
    question: 'What services does Demand Signals provide for client projects?',
    answer: 'Our client projects typically combine multiple capabilities depending on the business need. These include AI-optimized website builds, local SEO and Google Business Profile optimization, GEO and LLM optimization for AI citation visibility, AI voice receptionists and booking automation, content strategy and automated publishing, review management and reputation systems, and demand generation campaigns with lead qualification funnels.',
  },
  {
    question: 'Do you work with businesses outside of Northern California?',
    answer: 'Yes. While many of our clients are based in Northern California — particularly the Sacramento metro area, El Dorado County, and the Sierra Foothills — we serve clients across the United States, Thailand, Australia, and beyond. Our AI-powered systems work in any geography, and our strategies are tailored to the specific local market, competitors, and customer behavior of each region we operate in.',
  },
  {
    question: 'How do I get started with Demand Signals?',
    answer: 'The best first step is to book a free strategy call or request a free Demand Audit. The audit gives you a clear picture of your current visibility across Google, Maps, AI assistants, and social media, benchmarked against your local competitors. From there, we build a tailored engagement plan around the highest-impact opportunities. There is no obligation — the audit and action plan are yours to keep regardless of whether you choose to work with us.',
  },
]

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    const clientList = CLIENTS
      .map(c => `- **${c.name}** (${c.industry})`)
      .join('\n')

    md = [
      '# Portfolio — Demand Signals',
      '',
      '> Real businesses. Real results. AI-powered systems that drive measurable demand across Northern California and beyond.',
      '',
      '## Clients',
      '',
      clientList,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Portfolio](${SITE_URL}/portfolio)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const clientsBlock = CLIENTS
      .map(c => `### ${c.name}\n\n**Industry:** ${c.industry}\n\n${c.description}`)
      .join('\n\n')

    const faqsBlock = PORTFOLIO_FAQS
      .map(f => `### ${f.question}\n\n${f.answer}`)
      .join('\n\n')

    md = [
      '# Portfolio — Demand Signals',
      '',
      '> Real businesses. Real results. We work across industries in Northern California and beyond — building AI-powered systems that drive measurable demand.',
      '',
      '## Client Work',
      '',
      clientsBlock,
      '',
      '## Industries Served',
      '',
      '- Veterinary / Medical',
      '- Contractor & Construction',
      '- Medical & Wellness',
      '- Legal & Professional',
      '- Auto & Marine',
      '- Real Estate',
      '- Food & Beverage',
      '- Fitness & Sports',
      '- Health & Beauty',
      '- Specialty Retail',
      '- Education',
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Portfolio](${SITE_URL}/portfolio)  `,
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
