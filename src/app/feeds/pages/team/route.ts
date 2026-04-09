import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const LEADERSHIP = [
  {
    name: 'Hunter',
    title: 'Managing Director',
    bio: 'Hunter built and shipped his first client website while still in high school — and has not stopped shipping since. He leads Demand Signals from the front: setting strategy, closing deals, and overseeing every system the agency deploys. Based in Northern California, serving clients across the USA, Thailand, Australia and beyond. Behind him is a team of talented human strategists, developers, and creatives — each one empowered by enterprise-grade AI infrastructure and swarms of specialized agents.',
  },
  {
    name: 'Tiffany',
    title: 'Chief Technology Officer',
    bio: 'Tiffany is the architect behind the AI infrastructure that powers every Demand Signals engagement. She designed and built the multi-agent orchestration platform from the ground up — the system that coordinates content pipelines, voice reception agents, real-time rank monitoring loops, and autonomous outreach swarms across hundreds of client campaigns simultaneously. Before Demand Signals, Tiffany served as VP of Engineering at two venture-backed SaaS companies. She holds deep expertise in LLM orchestration, retrieval-augmented generation, vector search architectures, and production-grade prompt engineering.',
  },
  {
    name: 'Sarah',
    title: 'Chief Operating Officer',
    bio: 'Sarah runs the machine. As COO, she owns every client engagement from signed contract to delivered results — managing delivery operations, quality assurance, and the human + AI hybrid workflows that let a lean team produce the output of an agency ten times its size. Before Demand Signals, Sarah led operations at a top-50 US digital agency, where she built the systems that took them from 40 to 200+ managed accounts without proportional headcount growth. She oversees quality control on every AI-generated deliverable, manages the client success pipeline, and drives the continuous improvement cycles.',
  },
]

const AI_AGENTS = [
  { name: 'Website Intelligence Loop', role: 'Search & AI Visibility', desc: 'Monitors rankings daily, identifies opportunities, rewrites underperforming pages, and maintains schema and llms.txt.' },
  { name: 'Content & Social Loop', role: 'Content Generation', desc: 'Writes blog posts, social media, GBP content, and review responses. Plans calendars monthly, executes daily.' },
  { name: 'Reputation Loop', role: 'Review Management', desc: 'Monitors reviews across platforms, drafts professional responses, tracks sentiment, and alerts on critical reviews.' },
]

const MASCOTS = [
  { name: 'Tiki', subtitle: 'The Belly With Fur', desc: 'Husky. Heterochromatic. Horizontally gifted. Chief Morale Officer — the first to greet every visitor, the loudest voice in every Zoom call, and the undisputed champion of strategic napping.' },
  { name: 'Luna', subtitle: 'The Cuddly Queen', desc: 'Dark, elegant, and quietly running the entire operation from behind the scenes. VP of Vibes — she keeps the energy calm, the laps warm, and the office atmosphere impeccable.' },
]

const TEAM_FAQS = [
  {
    question: 'How does the human + AI model deliver better results than a traditional agency?',
    answer: 'Traditional agencies staff people to do tasks that AI now executes faster, more consistently, and at a fraction of the cost. Our model directs specialized AI agents at the repetitive, high-volume work — content production, rank monitoring, review responses, data extraction — while our human strategists focus entirely on judgment, strategy, and client relationships. The result is more output, better quality, faster iteration, and lower overhead than any traditional team can match.',
  },
  {
    question: 'What oversight do humans have over AI-generated work?',
    answer: 'Every piece of work that reaches a client is reviewed by a human strategist before delivery. Our AI agents handle research, drafting, optimization, and monitoring, but a human professional ensures accuracy, brand consistency, strategic alignment, and quality on every output. We run a system of editorial checkpoints and approval queues that keep humans accountable for what goes out under your brand.',
  },
  {
    question: 'How do your AI systems stay current with algorithm changes and market shifts?',
    answer: 'Our agent systems are continuously updated as search algorithms, AI model behaviors, and market conditions shift. We monitor industry signals daily, run our own research agents to detect ranking changes, and update prompt configurations, content strategies, and technical implementations as needed. Clients on managed plans benefit from these updates automatically — you do not need to ask for them.',
  },
  {
    question: 'Can you scale up or down based on how much I need?',
    answer: 'Yes. Our AI infrastructure scales with your needs. Clients can start with a single service — say, AI review management — and add content, outreach, or SEO services as they see results and want to expand. Scaling up does not require hiring and onboarding new people; it means configuring more agent capacity. And scaling down is just as simple, without layoff risk or agency contract penalties.',
  },
  {
    question: 'What is it actually like to work with Demand Signals day-to-day?',
    answer: 'You have a dedicated human strategist as your primary contact — reachable by email, phone, and video call. You receive regular performance reports and can request reviews or strategy updates at any time. The AI systems work in the background; you see the outputs (content drafts for approval, performance dashboards, review response queues) through straightforward tools, not complex software. Most clients describe it as having a high-output marketing team they never have to manage.',
  },
]

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    const teamList = LEADERSHIP
      .map(p => `- **${p.name}** — ${p.title}`)
      .join('\n')

    md = [
      '# Our Team — Demand Signals',
      '',
      '> 30 years of web development and marketing experience — amplified by AI systems that handle the repetitive work so we can focus on strategy, relationships, and results.',
      '',
      '## Leadership',
      '',
      teamList,
      '',
      '## AI Agent Systems',
      '',
      '- Website Intelligence Loop (Search & AI Visibility)',
      '- Content & Social Loop (Content Generation)',
      '- Reputation Loop (Review Management)',
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Team](${SITE_URL}/team)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const leadershipBlock = LEADERSHIP
      .map(p => `### ${p.name} — ${p.title}\n\n${p.bio}`)
      .join('\n\n')

    const agentsBlock = AI_AGENTS
      .map(a => `### ${a.name}\n\n**Role:** ${a.role}\n\n${a.desc}`)
      .join('\n\n')

    const mascotsBlock = MASCOTS
      .map(m => `### ${m.name} — ${m.subtitle}\n\n${m.desc}`)
      .join('\n\n')

    const faqsBlock = TEAM_FAQS
      .map(f => `### ${f.question}\n\n${f.answer}`)
      .join('\n\n')

    md = [
      '# Our Team — Demand Signals',
      '',
      '> Humans + AI. Working Together. 30 years of web development and marketing experience — amplified by AI systems that handle the repetitive work so we can focus on strategy, relationships, and results.',
      '',
      'We are not a headcount business. We are an intelligence operation — a lean human team directing purpose-built AI agents that work around the clock on your behalf.',
      '',
      '## Leadership Team',
      '',
      leadershipBlock,
      '',
      '## AI Agent Systems',
      '',
      'Every person on our team operates with AI agent swarms and enterprise-grade systems at their fingertips — multiplying their output, eliminating the repetitive work, and letting them focus entirely on what moves the needle for clients.',
      '',
      agentsBlock,
      '',
      '## Company Mascots',
      '',
      'Every great agency needs great mascots. Ours happen to be the most dedicated members of the team — on shift 24/7, never miss a meeting, and always available for moral support.',
      '',
      mascotsBlock,
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Team](${SITE_URL}/team)  `,
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
