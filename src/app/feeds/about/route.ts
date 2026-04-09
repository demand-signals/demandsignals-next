import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const VALUE_CARDS = [
  {
    title: 'AI-First by Design',
    body: 'We do not bolt AI onto old methods. Every system we build starts with intelligence \u2014 AI agents that research, write, optimize, and report so your business moves faster than your competitors.',
  },
  {
    title: 'Northern California Roots',
    body: 'Based in the Sierra Nevada foothills, we serve clients across the US, Thailand, Australia and beyond. We know local markets and understand what it takes for regional businesses to punch above their weight.',
  },
  {
    title: 'Data Before Dollars',
    body: 'We believe you should know where you stand before you spend anything. That is why we offer free intelligence reports \u2014 so every engagement starts with real insight, not guesswork.',
  },
]

const ABOUT_FAQS = [
  {
    question: 'How will working with Demand Signals actually change my business results?',
    answer: 'Clients typically see three things improve simultaneously: search visibility (ranking in Google, AI assistants, and local maps), lead volume (more qualified inbound inquiries), and operational efficiency (less time spent on marketing tasks that AI now handles). The combination compounds over time \u2014 better visibility brings more leads, better content builds more authority, and better reputation attracts higher-quality clients. Most clients see measurable movement within 60\u201390 days and significant business impact within six months.',
  },
  {
    question: 'How quickly can I expect to see a return on investment?',
    answer: 'It depends on the services engaged, but most clients break even within the first two to three months when compared to what they were previously spending on traditional agency retainers or in-house staff. AI systems that replace manual tasks \u2014 content writing, review responses, lead research \u2014 deliver immediate cost savings. Revenue impact from SEO and demand generation typically builds over 60\u2013180 days as rankings and visibility compound.',
  },
  {
    question: 'What makes AI-powered demand generation different from hiring a marketing team?',
    answer: 'A marketing hire works business hours, handles one task at a time, takes vacations, and costs $50,000\u2013$80,000 per year in salary and benefits. Our AI systems monitor your search presence daily, publish content on schedule, respond to reviews within minutes, and analyze your competitors continuously \u2014 all for a fraction of that cost. A dedicated human strategist oversees everything and handles the judgment calls that require real experience. You get enterprise-level output without enterprise-level headcount.',
  },
  {
    question: 'Do you work with businesses that already have a marketing strategy in place?',
    answer: 'Yes \u2014 and we often work alongside existing teams. We can plug into your current content workflow, amplify your SEO strategy with AI-generated supporting content, add AI search optimization on top of your existing site, or automate specific functions like review management without disrupting what is already working. A free intelligence report helps us identify exactly where the gaps are before recommending anything.',
  },
  {
    question: 'What does getting started with Demand Signals look like?',
    answer: 'It starts with a free 30-minute strategy call where we learn about your business, goals, and current marketing situation. From there, we run a free intelligence report that analyzes your search presence, competitor landscape, and top opportunities. You get a clear picture of where you stand and what the highest-ROI moves are \u2014 with no obligation. Most clients are ready to move forward within a week of seeing their report.',
  },
]

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    md = [
      '# About Demand Signals',
      '',
      '> We are an AI-first demand generation agency based in Northern California \u2014 built to help local and regional businesses compete at a national level using automation, AI agents, and real market data.',
      '',
      '**Website:** [demandsignals.co](https://demandsignals.co)  ',
      '**Contact:** [Get in Touch](https://demandsignals.co/contact)  ',
      '**Team:** [Meet Our Team](https://demandsignals.co/about/team)',
      '',
      '---',
      '',
      `**Full details:** [About Demand Signals](${SITE_URL}/feeds/about?detail=full)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const valuesBlock = VALUE_CARDS
      .map(v => `### ${v.title}\n\n${v.body}`)
      .join('\n\n')

    const faqsBlock = ABOUT_FAQS
      .map(f => `### ${f.question}\n\n${f.answer}`)
      .join('\n\n')

    md = [
      '# About Demand Signals',
      '',
      '> We are an AI-first demand generation agency based in Northern California \u2014 built to help local and regional businesses compete at a national level using automation, AI agents, and real market data.',
      '',
      '## Who We Are',
      '',
      'Demand Signals runs on a hybrid model \u2014 a lean human team directing a farm of specialized AI agents. Research agents. Content agents. SEO agents. Voice agents. Workflow automation agents. Each one is purpose-built and fine-tuned for a specific task.',
      '',
      'This architecture lets us deliver enterprise-grade output at small business pricing. We are not a traditional agency with junior copywriters billing hours \u2014 we are an intelligence operation that runs 24/7.',
      '',
      'Every engagement gets a dedicated human strategist who oversees the agents, reviews outputs, and ensures everything we deliver actually moves the needle for your business.',
      '',
      '## Our Values',
      '',
      valuesBlock,
      '',
      '## What We Do',
      '',
      'We replace marketing employees and agency retainers with AI systems that run 24/7 \u2014 so you get enterprise-grade output at small business pricing, without managing a team.',
      '',
      '**Your website, built by AI experts. Your content, generated by AI. Your reviews, handled by AI. Your social media, run by AI. You approve \u2014 AI does the rest.**',
      '',
      '### Service Categories',
      '',
      `- [Websites & Apps](${SITE_URL}/websites-apps) \u2014 WordPress, React/Next.js, Mobile Apps, Vibe Coding, UI/UX Design, Hosting`,
      `- [Demand Generation](${SITE_URL}/demand-generation) \u2014 Local SEO, GEO/AEO, Geo-Targeting, GBP Admin, Demand Systems`,
      `- [Content & Social](${SITE_URL}/content-social) \u2014 AI Content, Social Media, Review Management, Auto Blogging, Content Repurposing`,
      `- [AI & Agents](${SITE_URL}/ai-services) \u2014 AI Strategy, Workforce Automation, Infrastructure, Outreach, Agent Swarms, Private LLMs, Clawbot`,
      '',
      '## Location',
      '',
      'Based in Northern California (Sierra Nevada foothills), serving clients across the USA, Thailand, Australia and beyond.',
      '',
      '- **Phone:** (916) 542-2423',
      '- **Email:** DemandSignals@gmail.com',
      `- **Book a Call:** [Schedule a Strategy Call](${SITE_URL}/contact)`,
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `**Our team:** [Meet the Team](${SITE_URL}/about/team)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**Blog:** [Blog & News](${SITE_URL}/feeds/blog.md)  `,
      `**Contact us:** [Get in Touch](${SITE_URL}/contact)  `,
      `**Master FAQ:** [All FAQs](${SITE_URL}/faqs.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  }

  const conditional = checkConditional(request, md)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
