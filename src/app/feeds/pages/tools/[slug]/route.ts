import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

/* ── Tool data ───────────────────────────────────────────────────── */

interface ToolFaq {
  question: string
  answer: string
}

interface ToolData {
  title: string
  tagline: string
  description: string
  status: string
  features: string[]
  process: string[]
  deliverables: string[]
  faqs: ToolFaq[]
}

const TOOL_DATA: Record<string, ToolData> = {
  'demand-audit': {
    title: 'Free Demand Audit',
    tagline: 'See Exactly Where You Stand — Before You Spend a Dollar.',
    description:
      'Our AI scans your online presence across Google, Maps, social, and every AI assistant and tells you exactly where you are losing customers.',
    status: 'Free — Available Now',
    features: [
      'Google Search Rankings — actual keyword positions across the top 100 queries in your category and geography',
      'Google Maps & GMB — completeness, photo health, review velocity, category accuracy, and local pack visibility',
      'AI Visibility (ChatGPT / Gemini / Perplexity) — testing dozens of prompts to see if your business gets mentioned',
      'Social Media Presence — consistency, engagement, and signal quality across platforms',
      'Website Performance — Core Web Vitals, mobile speed, crawlability, structured data, and schema markup',
      'Competitor Gap Analysis — benchmark against your top 3 local competitors with specific gap identification',
    ],
    process: [
      'Book a 15-minute call — a few quick questions about your business, market, and competitors',
      'Our AI agents pull live data across all six audit layers',
      'A human strategist reviews the findings and builds your action plan',
      'Full report delivered within 48 business hours',
    ],
    deliverables: [
      'Full visibility scorecard across all 6 audit dimensions',
      'Top 10 priority fixes ranked by impact',
      'Side-by-side competitor benchmark',
      'AI citation status across ChatGPT, Gemini, and Perplexity',
      '30-day action plan with specific, sequenced tasks',
    ],
    faqs: [
      {
        question: 'What exactly does the free Demand Audit include?',
        answer:
          'The audit covers six critical visibility layers: Google Search rankings across your top 100 category keywords, Google Maps and Business Profile health, AI visibility across ChatGPT, Gemini, and Perplexity, social media presence and signal quality, website technical performance including Core Web Vitals, and a side-by-side competitor gap analysis. You receive a full scorecard, a top-10 priority fix list, and a 30-day action plan.',
      },
      {
        question: 'How long does the audit take to complete?',
        answer:
          'From the moment you complete your 15-minute intake call, our AI research agents begin pulling live data across all six audit dimensions. A human strategist then reviews the findings and builds your prioritized action plan. The full report is delivered within 48 business hours, and it is yours to keep whether or not you engage us for further work.',
      },
      {
        question: 'Is the audit really free? What is the catch?',
        answer:
          'There is no catch and no credit card required. We built the Demand Audit as a genuine value-first tool because we believe you should see where you stand before spending anything on marketing. The report is comprehensive and actionable on its own. If the data reveals opportunities where we can help, we will let you know — but there is zero obligation.',
      },
      {
        question: 'What makes this audit different from other free SEO tools?',
        answer:
          'Most free tools give you a generic score and a list of technical warnings. Our audit is built specifically for local businesses and includes AI citation testing — something almost no other tool offers. We test dozens of real prompts across ChatGPT, Gemini, and Perplexity to see if your business gets recommended, and we benchmark every metric against your actual local competitors rather than national averages.',
      },
      {
        question: 'Do I need to prepare anything before the audit call?',
        answer:
          'No preparation is required. During the 15-minute call we will ask a few quick questions about your business, your service area, and who your main competitors are. That is all we need to run a thorough audit. If you have access to your Google Business Profile or Google Analytics, that can help us go deeper, but it is not necessary to get started.',
      },
    ],
  },
  'research-reports': {
    title: 'Free Intelligence Reports',
    tagline: 'Know Exactly Where You Stand — Before You Spend a Dollar.',
    description:
      'Our AI research agents build custom intelligence reports in 48 hours. Real data. Real recommendations. Zero cost for your first report.',
    status: 'Free — Available Now',
    features: [
      'Competitor Intelligence Report ($800 value) — competitor keyword rankings, GMB performance comparison, backlink gap analysis, content strategy breakdown, 3 immediate opportunities',
      'Market Demand Analysis ($650 value) — total addressable search volume, top 50 target keywords, seasonal demand calendar, geographic heat map, recommended content priorities',
      'SEO + GEO + AEO Audit ($1,200 value) — current ranking positions (top 100 keywords), AI citation analysis (ChatGPT, Perplexity, Gemini), schema markup audit, AEO/Voice optimization score, priority fix list',
      'Strategic Project Plan ($600 value) — 90-day action plan, KPI targets and measurement framework, budget allocation recommendations, week-by-week task calendar, implementation priority matrix',
    ],
    process: [
      'Submit your request through the form with your business details and desired report type',
      'Our AI research agents pull real market data, competitor signals, and ranking data',
      'Our team reviews every report for accuracy, context, and actionability',
      'Report delivered to your inbox within 48 hours as a polished, actionable PDF',
    ],
    deliverables: [
      'Custom AI-built intelligence report based on your selected type',
      'Real data from live market signals (not estimates or projections)',
      'Prioritized recommendations specific to your business and market',
      'Human-reviewed for accuracy before delivery',
    ],
    faqs: [
      {
        question: 'Are the intelligence reports really free?',
        answer:
          'Yes, your first report is completely free with no strings attached. We use AI research agents to pull real market data, then our team reviews every report for accuracy before delivery. We offer these reports because they demonstrate the depth of our capabilities and give you actionable intelligence you can use immediately, whether or not you become a client.',
      },
      {
        question: 'How long does it take to receive my report?',
        answer:
          'Reports are delivered to your inbox within 48 hours of your request. Our AI research agents begin data collection within minutes of submission, and a human strategist reviews every report for accuracy and actionability before it goes out. You will receive a polished PDF with clear findings and prioritized recommendations.',
      },
      {
        question: 'What data sources do your AI research agents use?',
        answer:
          'Our agents pull from multiple real-time data sources including Google search rankings, Google Business Profile metrics, backlink databases, keyword volume APIs, and AI citation platforms like ChatGPT and Perplexity. Every data point in your report comes from live market signals, not estimates or projections. We cross-reference multiple sources to ensure accuracy.',
      },
      {
        question: 'Can I request more than one type of report?',
        answer:
          'Your first report of any type is free. If you find the first report valuable, we are happy to run additional reports at no cost as part of a strategy conversation. Many clients request a Competitor Intelligence report first, then follow up with a full SEO + GEO + AEO Audit once they see the depth of insight our AI agents deliver.',
      },
      {
        question: 'Will someone try to sell me services after I receive my report?',
        answer:
          'We will follow up to make sure you received the report and to answer any questions about the findings. There is no hard sell, no recurring calls, and no obligation. If the report reveals opportunities you want help executing, we are here to discuss next steps — but only if you initiate that conversation. Our goal is to earn trust through value, not pressure.',
      },
    ],
  },
  'demand-links': {
    title: 'Demand Links — AI Link Intelligence',
    tagline: 'Build the Exact Authority Signals Google and AI Need to Trust You.',
    description:
      'AI-powered link intelligence that identifies and builds the specific backlinks your business needs to rank and get cited.',
    status: 'Coming Soon',
    features: [
      'Identify Competitor Link Gaps — map every domain linking to your top competitors and surface the exact opportunities your site is missing',
      'Find Local Citation Opportunities — identify every citation source you should be on for maps rankings',
      'Track Link Velocity — see how fast your link profile is growing versus competitors with pace monitoring',
      'Alert on Lost Links — monitor your entire link profile and alert immediately when a valuable link is lost',
    ],
    process: [
      'Sign up for early access through the contact page',
      'Get priority onboarding when the tool launches',
      'Receive founding member pricing',
      'Get a direct line to our product team to help shape features',
    ],
    deliverables: [
      'Competitor backlink profile mapping',
      'Local citation opportunity identification',
      'Link velocity tracking and monitoring',
      'Lost link alerts and recovery recommendations',
    ],
    faqs: [
      {
        question: 'What is Demand Links and how does it work?',
        answer:
          'Demand Links is an AI-powered link intelligence tool that maps your competitors\u2019 entire backlink profiles, identifies the exact citation and link opportunities your business is missing, and tracks your link acquisition velocity over time. Unlike generic backlink checkers, it is built specifically for local and regional businesses and focuses on the authority signals that both Google and AI assistants use to rank and recommend businesses.',
      },
      {
        question: 'Why do backlinks still matter for local businesses?',
        answer:
          'Backlinks remain Google\u2019s single strongest authority signal for determining which businesses rank highest in search results and the local map pack. Beyond traditional SEO, AI models like ChatGPT, Gemini, and Perplexity also rely heavily on the web\u2019s link graph when deciding which businesses to recommend. Businesses with strong, relevant link profiles from local news outlets, industry publications, and trusted directories get cited by AI far more often than those without.',
      },
      {
        question: 'What types of link opportunities does Demand Links find?',
        answer:
          'The tool identifies multiple categories of link opportunities including local business directories, chamber of commerce listings, industry-specific citation sources, local news and publication mentions, competitor-exclusive links you should also have, and broken link recovery opportunities. Every recommendation is specific to your business category and geographic market rather than generic national directories.',
      },
      {
        question: 'How is Demand Links different from tools like Ahrefs or Moz?',
        answer:
          'While enterprise tools like Ahrefs and Moz provide raw backlink data, Demand Links is purpose-built for local businesses and focuses on actionable intelligence rather than data dumps. It automatically prioritizes the links that will have the most impact on your local rankings and AI citation status, tracks link velocity relative to your specific competitors, and alerts you immediately when valuable links are lost so you can take recovery action.',
      },
      {
        question: 'When will Demand Links be available?',
        answer:
          'Demand Links is currently in active development. We are opening a limited early access cohort with founding member pricing and hands-on onboarding. You can join the waitlist through our contact page to get priority access when we launch.',
      },
    ],
  },
  'dynamic-qr': {
    title: 'Dynamic QR Codes',
    tagline: 'Track Every Scan. Update Any Destination. No Reprinting.',
    description:
      'Smart QR codes for business cards, menus, signage, and ads — with real-time scan analytics and editable destinations.',
    status: 'Coming Soon',
    features: [
      'Real-Time Scan Analytics — total scans, unique scans, scan-over-time charts, and device breakdown in a live dashboard',
      'Geo-Location Tracking — see where each scan originated, map scan density by city, ZIP code, or neighborhood',
      'UTM Parameter Auto-Tagging — every scan automatically appends UTM parameters for clean Google Analytics attribution',
      'Bulk QR Generation — generate hundreds of unique QR codes at once for product packaging, event badges, or multi-location rollouts',
      'Custom Branded QR Designs — replace generic black-and-white with your brand colors, logo, and custom frame',
    ],
    process: [
      'Generate a dynamic QR code linked to any URL — menu, booking page, portfolio, or landing page',
      'Choose your design, colors, and optional logo overlay',
      'Deploy on any physical surface — business cards, table tents, vehicle wraps, event signage, packaging',
      'Track scans and update destinations anytime through your dashboard',
    ],
    deliverables: [
      'Dynamic QR codes with editable destinations',
      'Real-time scan analytics dashboard',
      'Geo-location tracking per scan',
      'UTM auto-tagging for Google Analytics',
      'Branded QR code designs with logo overlay',
    ],
    faqs: [
      {
        question: 'What is the difference between a static QR code and a dynamic QR code?',
        answer:
          'A static QR code permanently encodes a single URL directly into its pattern — once printed, it can never be changed. A dynamic QR code points to an intermediate redirect that you control, meaning you can update the destination URL at any time without reprinting the physical code. Dynamic QR codes also enable scan tracking, geo-location analytics, and UTM parameter tagging that static codes cannot provide.',
      },
      {
        question: 'Can I update where my QR code points after printing it?',
        answer:
          'Yes, that is the core advantage of dynamic QR codes. You can change the destination URL as many times as you need through your dashboard without ever reprinting the physical code. This is ideal for restaurant menus that change seasonally, business cards that need updated portfolio links, or event signage that should redirect to a recap page after the event ends.',
      },
      {
        question: 'What analytics do dynamic QR codes provide?',
        answer:
          'Our dynamic QR platform provides real-time scan analytics including total and unique scan counts, scan-over-time charts, device and operating system breakdowns, and geo-location data by city, ZIP code, and neighborhood. Every scan is automatically tagged with UTM parameters for clean attribution in Google Analytics. This turns every physical placement into a measurable marketing channel.',
      },
      {
        question: 'What are the best use cases for dynamic QR codes in local businesses?',
        answer:
          'The most effective use cases include restaurant table tents linked to daily-updated menus, business cards with editable portfolio or booking links, vehicle wraps with location-tracked scan data to measure route effectiveness, event signage that can be redirected post-event, and product packaging with links to tutorials or warranty registration.',
      },
      {
        question: 'Can I customize the design of my QR codes with my brand colors and logo?',
        answer:
          'Yes, our platform supports fully branded QR code designs including custom colors, logo overlays, and branded frames. Research shows that branded QR codes generate significantly higher scan rates than generic black-and-white codes because customers trust them more.',
      },
    ],
  },
}

const VALID_SLUGS = Object.keys(TOOL_DATA)

/* ── Route handler ───────────────────────────────────────────────── */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!VALID_SLUGS.includes(slug)) {
    return new Response(`# 404 — Tool Not Found\n\nNo tool found for slug: \`${slug}\`\n\nAvailable tools: ${VALID_SLUGS.join(', ')}`, {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const tool = TOOL_DATA[slug]
  const detail = getDetailLevel(request)
  const toolUrl = slug === 'research-reports' ? '/tools/research-reports' : `/tools/${slug}`

  let md: string

  if (detail === 'summary') {
    md = [
      `# ${tool.title} — Demand Signals`,
      '',
      `> ${tool.tagline}`,
      '',
      `**Status:** ${tool.status}`,
      '',
      tool.description,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [${tool.title}](${SITE_URL}${toolUrl})  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const featuresBlock = tool.features
      .map((f, i) => `${i + 1}. ${f}`)
      .join('\n')

    const processBlock = tool.process
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n')

    const deliverablesBlock = tool.deliverables
      .map(d => `- ${d}`)
      .join('\n')

    const faqsBlock = tool.faqs
      .map(f => `### ${f.question}\n\n${f.answer}`)
      .join('\n\n')

    md = [
      `# ${tool.title} — Demand Signals`,
      '',
      `> ${tool.tagline}`,
      '',
      `**Status:** ${tool.status}`,
      '',
      tool.description,
      '',
      '## Features',
      '',
      featuresBlock,
      '',
      '## Process',
      '',
      processBlock,
      '',
      '## Deliverables',
      '',
      deliverablesBlock,
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [${tool.title}](${SITE_URL}${toolUrl})  `,
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
