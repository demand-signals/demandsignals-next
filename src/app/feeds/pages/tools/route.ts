import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const TOOLS = [
  {
    title: 'Demand Audit',
    description: 'Get a quick snapshot of your business\'s online demand health — search visibility, competitor gaps, and top opportunities — in minutes.',
    href: '/tools/demand-audit',
    badge: 'Free',
    available: true,
  },
  {
    title: 'Intelligence Reports',
    description: 'Request a custom AI-built intelligence report — competitor analysis, market demand mapping, SEO/GEO audit, or a strategic 90-day plan.',
    href: '/tools/research-reports',
    badge: 'Free',
    available: true,
  },
  {
    title: 'Demand Links',
    description: 'Build a high-authority, AI-optimized local citation profile. Our agents identify the exact directories and link opportunities for your category.',
    href: '/tools/demand-links',
    badge: 'Coming Soon',
    available: false,
  },
  {
    title: 'Dynamic QR',
    description: 'Create smart, trackable QR codes that adapt their destination based on time, location, or campaign. Built for local marketing campaigns.',
    href: '/tools/dynamic-qr',
    badge: 'Coming Soon',
    available: false,
  },
]

const TOOLS_FAQS = [
  {
    question: 'What free tools does Demand Signals offer?',
    answer: 'We currently offer a free Demand Audit that scans your online presence across Google, Maps, AI assistants, and social media, plus free Intelligence Reports with custom AI-built competitor analysis and market demand mapping. Two additional tools — Demand Links for AI-powered link intelligence and Dynamic QR for trackable smart QR codes — are in active development and coming soon.',
  },
  {
    question: 'Are these tools really free, or is there a catch?',
    answer: 'They are genuinely free with no credit card required and no upsell walls. We built them to give local businesses real market intelligence so you can see where you stand before spending a dollar. If the data shows you need help, we are here — but the tools deliver value on their own regardless of whether you become a client.',
  },
  {
    question: 'How do your free tools differ from generic SEO audit tools?',
    answer: 'Most free audit tools give you a vanity score and a list of technical issues. Our tools are built specifically for local and regional businesses and go beyond traditional SEO. We audit AI visibility across ChatGPT, Gemini, and Perplexity, analyze your Google Business Profile health, benchmark you against real local competitors, and deliver a prioritized action plan — not just a checklist.',
  },
  {
    question: 'Who are these tools designed for?',
    answer: 'Our tools are designed for local and regional business owners who want data-driven insight into their online visibility without hiring an agency first. Whether you run a dental practice, law firm, restaurant, contractor business, or retail store, these tools analyze the specific signals that determine whether customers find you or your competitor.',
  },
  {
    question: 'How long does it take to get results from a free tool?',
    answer: 'The Demand Audit delivers a full visibility scorecard, competitor benchmark, and prioritized action plan within 48 hours of a short 15-minute intake call. Intelligence Reports follow a similar timeline. Both are prepared by our AI research agents and reviewed by a human strategist before delivery, ensuring every recommendation is actionable and relevant to your specific market.',
  },
]

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    const toolList = TOOLS
      .map(t => `- **${t.title}** — ${t.badge} — [${t.href}](${SITE_URL}${t.href})`)
      .join('\n')

    md = [
      '# Free Tools — Demand Signals',
      '',
      '> Free, AI-powered tools built to give you real market intelligence — not generic scores and upsell walls.',
      '',
      '## Tools',
      '',
      toolList,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Tools](${SITE_URL}/tools)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const toolsBlock = TOOLS
      .map(t => `### [${t.title}](${SITE_URL}${t.href})\n\n**Status:** ${t.badge}${t.available ? ' — Available Now' : ''}\n\n${t.description}`)
      .join('\n\n')

    const faqsBlock = TOOLS_FAQS
      .map(f => `### ${f.question}\n\n${f.answer}`)
      .join('\n\n')

    md = [
      '# Free Tools — Demand Signals',
      '',
      '> Tools That Actually Tell You Something — For Free.',
      '',
      'Free, AI-powered tools built to give you real market intelligence — not generic scores and upsell walls.',
      '',
      '## Available Tools',
      '',
      toolsBlock,
      '',
      '## Individual Tool Feeds',
      '',
      `- [Demand Audit](${SITE_URL}/feeds/pages/tools/demand-audit)`,
      `- [Intelligence Reports](${SITE_URL}/feeds/pages/tools/research-reports)`,
      `- [Demand Links](${SITE_URL}/feeds/pages/tools/demand-links)`,
      `- [Dynamic QR](${SITE_URL}/feeds/pages/tools/dynamic-qr)`,
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Tools](${SITE_URL}/tools)  `,
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
