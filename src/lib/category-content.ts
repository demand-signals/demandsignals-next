/**
 * Centralized category page content — services and FAQs extracted from
 * each of the 4 category index pages.
 */

export type CategoryService = {
  icon: string
  href: string
  title: string
  description: string
  features: string[]
}

export type CategoryFaq = {
  question: string
  answer: string
}

export type CategoryContent = {
  slug: string
  name: string
  description: string
  callout: string
  services: CategoryService[]
  faqs: CategoryFaq[]
}

export const CATEGORY_CONTENT: CategoryContent[] = [
  // ── Websites & Apps ─────────────────────────────────────────────
  {
    slug: 'websites-apps',
    name: 'Websites & Apps',
    description: 'From WordPress marketing sites to full-stack Next.js platforms and mobile apps — every build includes AI features, GEO optimization, and continuous improvement from day one.',
    callout: 'We don\'t build websites that look pretty and sit idle. Every site we ship is actively generating leads, ranking in AI search results, and improving itself — 24 hours a day, 7 days a week.',
    services: [
      {
        icon: '🏢',
        href: '/websites-apps/wordpress-development',
        title: 'WordPress Sites',
        description: 'AI-managed WordPress sites built for local search, GEO citations, and automated lead generation. Custom themes, WooCommerce, ACF Pro — connected to an AI content pipeline.',
        features: ['Custom WordPress themes', 'WooCommerce stores', 'AI content pipelines', 'Managed hosting + CDN'],
      },
      {
        icon: '⚡',
        href: '/websites-apps/react-next-webapps',
        title: 'React / Next.js Apps',
        description: 'Full-stack web applications on Next.js with AI features baked in. TypeScript, Supabase, edge deployment, and Claude API integrations from day one.',
        features: ['Next.js App Router', 'TypeScript (strict)', 'AI features built-in', 'Vercel edge deployment'],
      },
      {
        icon: '📱',
        href: '/websites-apps/mobile-apps',
        title: 'iOS & Android Apps',
        description: 'Cross-platform mobile apps with React Native and Expo. AI features, push notifications, offline mode, and App Store publishing — one codebase, both stores.',
        features: ['React Native + Expo', 'AI-powered features', 'Push notifications', 'App Store publishing'],
      },
      {
        icon: '🤖',
        href: '/websites-apps/vibe-coded',
        title: 'Vibe Coded Web Apps',
        description: 'AI-built web applications shipped fast using Cursor, Claude Code, and Lovable. Prototype to production in days — not months.',
        features: ['Cursor + Claude Code', 'Rapid iteration', 'Real databases', 'Production-ready'],
      },
      {
        icon: '🎨',
        href: '/websites-apps/design',
        title: 'UI/UX Design',
        description: 'Figma-based design systems, high-fidelity UI, user research, and AI-assisted prototyping. Brand-consistent design that ships with your product.',
        features: ['Figma design systems', 'Component libraries', 'AI-assisted ideation', 'Dev-ready handoff'],
      },
      {
        icon: '🖥️',
        href: '/websites-apps/hosting',
        title: 'Agent & App Hosting',
        description: 'Managed hosting infrastructure on Vercel, Cloudflare, and DSIG. Zero-config deployments, edge CDN, SSL, and automated monitoring for every site and app we build.',
        features: ['Vercel Pro hosting', 'Cloudflare CDN + DNS', 'Automated deployments', '99.99% uptime SLA'],
      },
    ],
    faqs: [
      {
        question: 'What results can I realistically expect from a new website?',
        answer: 'A professionally built, AI-optimized site typically delivers measurable improvements within 60\u201390 days \u2014 higher search rankings, more inbound leads, and improved conversion rates from existing traffic. Our clients routinely see first-page local rankings within 90 days and double-digit increases in qualified leads within six months. We back every engagement with real performance reporting, not vanity metrics.',
      },
      {
        question: 'How long until my new site starts generating leads?',
        answer: 'Most sites begin attracting organic traffic within 30\u201360 days of launch once indexed by Google and AI search engines. Paid and local search results can come even faster. The AI content pipelines we connect to your site keep it fresh and relevant, which accelerates ranking velocity compared to a static site that never updates itself.',
      },
      {
        question: 'Will my website show up in AI search results, not just Google?',
        answer: 'Yes \u2014 every site we build is optimized for traditional SEO, Generative Engine Optimization (GEO), and Answer Engine Optimization (AEO). That means structured data, llms.txt, clear semantic markup, and content written to be cited by ChatGPT, Perplexity, Claude, and other AI assistants. Most agencies ignore this entirely. We prioritize it.',
      },
      {
        question: 'Can you build something custom if my business has unique needs?',
        answer: 'Custom is our default. Whether you need a booking system, client portal, AI-powered search, multi-location management, or e-commerce with complex inventory rules \u2014 we scope and build exactly what your business requires. We don\'t force clients into templates that almost fit.',
      },
      {
        question: 'What ongoing support do you provide after launch?',
        answer: 'We offer managed services that keep your site performing long after launch \u2014 AI-generated content updates, technical SEO maintenance, Core Web Vitals monitoring, security patching, and continuous schema optimization. Think of it less as a website handoff and more as an ongoing intelligence operation working for your business.',
      },
    ],
  },

  // ── Demand Generation ───────────────────────────────────────────
  {
    slug: 'demand-generation',
    name: 'Demand Generation',
    description: 'Search, AI answers, Maps, and local discovery \u2014 we build the systems that put your business in front of buyers across every channel that matters.',
    callout: 'We run a three-layer discovery strategy \u2014 traditional SEO, Generative Engine Optimization, and Answer Engine Optimization \u2014 so your business gets found everywhere customers are searching, including AI chat.',
    services: [
      {
        icon: '🔮',
        href: '/demand-generation/geo-aeo-llm-optimization',
        title: 'LLM Optimization',
        description: 'Get your business cited by ChatGPT, Perplexity, Gemini, and Google AI Overviews. We optimize your content structure, schema markup, and llms.txt for AI discovery \u2014 the fastest-growing search channel.',
        features: ['GEO / AEO optimization', 'llms.txt management', 'AI citation monitoring', 'Schema markup automation'],
      },
      {
        icon: '📍',
        href: '/demand-generation/local-seo',
        title: 'Local SEO',
        description: 'Dominate your local market in organic search. Longtail keyword targeting, citation building, review platform optimization, and programmatic city \u00d7 service pages that compound authority.',
        features: ['Longtail keyword strategy', 'Citation building', 'GSC monitoring', 'Programmatic content'],
      },
      {
        icon: '🎯',
        href: '/demand-generation/geo-targeting',
        title: 'Geo-Targeting',
        description: 'Hyper-local targeting across counties, cities, and neighborhoods. We build programmatic location pages that rank for every service \u00d7 city combination in your territory.',
        features: ['County \u00d7 city pages', 'Service area targeting', 'Local content strategy', 'Map Pack optimization'],
      },
      {
        icon: '📌',
        href: '/demand-generation/gbp-admin',
        title: 'Google Business Admin',
        description: 'Full GBP management \u2014 posts, photos, Q&A responses, attribute optimization, and review monitoring. Your Google Business Profile stays active and competitive without you touching it.',
        features: ['GBP post scheduling', 'Review monitoring', 'Q&A management', 'Photo optimization'],
      },
      {
        icon: '⚙️',
        href: '/demand-generation/systems',
        title: 'Demand Gen Systems',
        description: 'Full-stack demand generation pipelines that run 24/7. AI monitors your search performance, identifies opportunities, creates content, and reports results \u2014 all automatically.',
        features: ['Automated pipelines', 'AI content generation', 'Performance monitoring', 'Lead routing'],
      },
    ],
    faqs: [
      {
        question: 'How quickly can demand generation campaigns start producing results?',
        answer: 'Local SEO improvements are typically visible within 60\u201390 days as Google reindexes and re-evaluates your authority signals. GBP optimization and citation building produce ranking lifts in Google Maps within 30\u201345 days. AI search citation rates improve within weeks of publishing properly structured content. We provide monthly reporting so you can see exactly what\'s moving.',
      },
      {
        question: 'What is the difference between SEO, GEO, and AEO \u2014 and why do all three matter?',
        answer: 'Traditional SEO targets Google and Bing. Generative Engine Optimization (GEO) targets AI-powered search summaries like ChatGPT and Perplexity, which now answer millions of queries before users ever click a link. Answer Engine Optimization (AEO) targets featured snippets and voice search. Running all three simultaneously creates a discovery layer most of your competitors haven\'t built yet.',
      },
      {
        question: 'Can you help if my competitors are already dominating local search?',
        answer: 'Yes \u2014 and this is often where we do our best work. We analyze your competitors\' authority signals, content gaps, and citation profile, then build a strategy that overtakes them systematically. Dominant competitors have weaknesses. Our research agents find them and we exploit them with consistent, high-quality signals that compound over time.',
      },
      {
        question: 'Do I need to already have a website for demand generation to work?',
        answer: 'You need a solid online presence, but it doesn\'t have to be perfect before we start. Many clients come to us with an outdated site and we run demand generation in parallel with a rebuild. GBP optimization, citation building, and review management can begin immediately, while the new website adds fuel once it launches.',
      },
      {
        question: 'How do AI-powered demand systems outperform traditional agencies?',
        answer: 'Traditional agencies bill hours for manual tasks \u2014 writing one blog post at a time, manually checking rankings, sending monthly reports. Our systems monitor your search presence daily, update content automatically, respond to reviews in real time, and push your business into new ranking positions continuously. The output is higher, the speed is faster, and the cost is a fraction of a traditional retainer.',
      },
    ],
  },

  // ── Content & Social ────────────────────────────────────────────
  {
    slug: 'content-social',
    name: 'Content & Social',
    description: 'AI writes your content, manages your social media, responds to your reviews, and publishes your blog \u2014 24/7, at a fraction of the cost of a marketing coordinator.',
    callout: 'Your content engine never sleeps, never runs dry, and never misses a post \u2014 so you stay top of mind with customers while you focus on running your business.',
    services: [
      {
        icon: '✍️',
        href: '/content-social/ai-content-generation',
        title: 'AI Content Generation',
        description: 'GEO-first content built to rank in search and get cited by AI. Blog posts, service pages, landing pages, and FAQs \u2014 written by AI, structured for discovery, reviewed by humans.',
        features: ['GEO-optimized content', 'SEO-structured writing', 'Brand voice matching', 'Human review workflow'],
      },
      {
        icon: '📣',
        href: '/content-social/ai-social-media-management',
        title: 'AI Social Media Management',
        description: 'AI generates posts across every platform, tailored to your brand voice. 5-7 posts per week, scheduled automatically. You approve in 10 minutes \u2014 AI handles everything else.',
        features: ['Multi-platform posting', 'Brand voice AI', 'Content calendar automation', 'Engagement tracking'],
      },
      {
        icon: '⭐',
        href: '/content-social/ai-review-auto-responders',
        title: 'AI Review Auto Responders',
        description: 'Every Google review responded to within hours \u2014 positive reviews acknowledged, negative reviews handled professionally. AI drafts, you approve (or auto-publish high-confidence responses).',
        features: ['Instant review detection', 'Sentiment analysis', 'Professional responses', 'Auto-publish option'],
      },
      {
        icon: '📝',
        href: '/content-social/ai-auto-blogging',
        title: 'AI Auto Blogging',
        description: 'Weekly blog content targeting the search terms that drive business. AI researches topics, writes SEO-structured articles, and publishes them \u2014 building your authority on autopilot.',
        features: ['Topic research AI', 'SEO-structured articles', 'Automatic publishing', 'Authority building'],
      },
      {
        icon: '🔄',
        href: '/content-social/ai-content-repurposing',
        title: 'AI Content Republishing',
        description: 'One piece of content becomes ten. AI repurposes blog posts into social media, email newsletters, LinkedIn articles, GMB posts, and more \u2014 maximizing every piece you produce.',
        features: ['Blog \u2192 social media', 'Cross-platform adaptation', 'Format optimization', 'Consistent messaging'],
      },
    ],
    faqs: [
      {
        question: 'How much content can AI actually produce without losing quality?',
        answer: 'At scale, our AI content systems produce 30\u201350 pieces of content per month per client \u2014 blog posts, social updates, GBP posts, review responses, and email sequences \u2014 all reviewed for brand voice and accuracy before publishing. Quality is enforced through editorial guidelines, brand voice profiles, and human review checkpoints. Volume without quality is noise; we do both.',
      },
      {
        question: 'Will AI-generated content hurt my search rankings?',
        answer: 'Not when it\'s done correctly. Google\'s guidelines target low-quality, spammy content \u2014 not AI-assisted content that is accurate, helpful, and well-structured. Our content is researched with real data, written to match your brand voice, reviewed by a human strategist, and optimized with proper headings, schema, and internal linking. It performs as well or better than content produced manually.',
      },
      {
        question: 'How does AI manage social media without sounding robotic?',
        answer: 'We build a detailed brand voice profile for every client \u2014 tone, vocabulary, topics to lean into, topics to avoid, and examples of content you love. Our AI uses this profile to generate social content that sounds like you, not like a chatbot. A human reviewer approves anything that goes out under your name, so nothing reaches your audience without passing a quality check.',
      },
      {
        question: 'What is AI review auto-responding and how does it protect my reputation?',
        answer: 'Our review management system monitors new reviews across Google, Yelp, Facebook, and other platforms in real time. When a review comes in, an AI drafts a professional, brand-appropriate response within minutes. Positive reviews get personalized thanks. Negative reviews get calm, solution-oriented replies designed to demonstrate responsiveness. A human approves all responses before they post, or you can approve them yourself through a simple dashboard.',
      },
      {
        question: 'How often will content be published across my channels?',
        answer: 'Publication frequency is set based on your goals and channels. A standard content package typically includes 4\u20138 blog posts per month, daily or near-daily social media posts, 4 GBP posts per month, and real-time review responses. Higher-tier packages include video scripts, email sequences, and content repurposing across multiple formats from each primary piece.',
      },
    ],
  },

  // ── AI & Agent Services ─────────────────────────────────────────
  {
    slug: 'ai-services',
    name: 'AI & Agent Services',
    description: 'From strategy to implementation \u2014 we build and deploy AI systems that replace manual processes, reduce costs, and deliver better results than the teams they replace.',
    callout: 'Our AI agent systems work 24/7 so your team stops doing the tasks AI does better \u2014 and starts focusing on the strategy, relationships, and decisions that only humans can handle.',
    services: [
      {
        icon: '🧠',
        href: '/ai-services/ai-automation-strategies',
        title: 'AI Adoption Strategies',
        description: 'Custom roadmaps to integrate AI across your business. We audit your operations, identify the highest-ROI automation opportunities, and build a phased plan to replace manual work with AI systems.',
        features: ['Operations audit', 'ROI analysis', 'Phased implementation', 'Change management'],
      },
      {
        icon: '👥',
        href: '/ai-services/ai-workforce-automation',
        title: 'AI Workforce Automation',
        description: 'Replace specific, expensive, inconsistent human roles with AI systems that cost less and perform better. Content creation, data entry, scheduling, reporting, customer service \u2014 all automatable.',
        features: ['Role replacement analysis', 'Custom AI agents', 'Workflow integration', 'Cost reduction tracking'],
      },
      {
        icon: '🏗️',
        href: '/ai-services/ai-agent-infrastructure',
        title: 'AI Infrastructure',
        description: 'The systems architecture powering AI operations \u2014 database design, API integrations, pipeline orchestration, monitoring, and alerting. The plumbing that makes AI agents work reliably.',
        features: ['Supabase + PostgreSQL', 'Pipeline orchestration', 'Monitoring & alerts', 'API integrations'],
      },
      {
        icon: '📧',
        href: '/ai-services/ai-automated-outreach',
        title: 'AI Powered Outreach',
        description: 'Personalized prospecting and lead routing at scale. AI researches prospects, crafts personalized messages, manages sequences, and routes qualified leads to your sales process.',
        features: ['Prospect research AI', 'Personalized messaging', 'Sequence automation', 'Lead scoring & routing'],
      },
      {
        icon: '🐝',
        href: '/ai-services/ai-agent-swarms',
        title: 'AI Agent Swarms',
        description: 'Networks of autonomous AI agents handling marketing operations 24/7. Each agent specializes in a function \u2014 content, SEO, reviews, outreach \u2014 and they coordinate through shared data.',
        features: ['Multi-agent orchestration', 'Specialized functions', 'Database coordination', '24/7 autonomous operation'],
      },
      {
        icon: '🔒',
        href: '/ai-services/private-llms',
        title: 'AI Private LLMs',
        description: 'Self-hosted language models for businesses with sensitive data. Keep your proprietary information off third-party servers while still leveraging AI for content, analysis, and automation.',
        features: ['On-premise deployment', 'Data sovereignty', 'Custom fine-tuning', 'Enterprise security'],
      },
      {
        icon: '🕷️',
        href: '/ai-services/clawbot-setup',
        title: 'AI Clawbot Setup',
        description: 'Intelligent web crawlers that gather competitive intelligence, monitor pricing, track citations, and feed data to your AI systems. Automated research at scale.',
        features: ['Competitive monitoring', 'Price tracking', 'Citation monitoring', 'Data pipeline automation'],
      },
    ],
    faqs: [
      {
        question: 'What business problems are AI agents best at solving?',
        answer: 'AI agents excel at high-volume, repetitive, research-intensive tasks that currently eat up your team\'s time. Lead qualification and outreach, content generation at scale, competitive monitoring, data extraction and aggregation, customer review management, appointment scheduling, and internal reporting are all areas where agents outperform humans in speed, consistency, and cost \u2014 often by a factor of 10x or more.',
      },
      {
        question: 'How long does it take to implement AI systems for my business?',
        answer: 'Most initial AI system deployments take 2\u20134 weeks from kickoff to live operation. Simpler automations like review responders or AI content pipelines can go live in under a week. More complex agent swarms \u2014 such as full lead research and outreach systems or multi-department workflow automation \u2014 typically take 4\u20138 weeks to design, build, test, and tune. We always start with a discovery phase to identify your highest-ROI use case and build there first.',
      },
      {
        question: 'What is the return on investment for AI workforce automation?',
        answer: 'The ROI depends on what you\'re automating, but replacing a single full-time marketing or admin role with an AI system that costs a fraction of the monthly salary is the most common win. Clients who implement our outreach agents routinely generate 3\u20135x more qualified prospect touchpoints per week than their sales team could manage manually. The key is identifying the right processes to automate first \u2014 which is exactly what our adoption strategy service does.',
      },
      {
        question: 'Do I need technical staff to manage the AI systems you deploy?',
        answer: 'No. We build every system to be managed by non-technical business owners. Dashboards are simple, alerts are plain-language, and we handle all the maintenance, updates, and model improvements behind the scenes. Your team interacts with the outputs \u2014 leads, content, reports, responses \u2014 not with the infrastructure. If something needs attention, your dedicated strategist handles it.',
      },
      {
        question: 'What makes a private LLM different from just using ChatGPT?',
        answer: 'A private LLM runs on your infrastructure with your data, your customizations, and your security controls. It can be trained or fine-tuned on your company\'s specific knowledge \u2014 products, pricing, policies, past conversations \u2014 so it answers questions the way your business would. Nothing leaves your environment, which matters for industries with privacy requirements like healthcare, legal, and finance. It also doesn\'t share your competitive intelligence with a public model.',
      },
    ],
  },
]

/** Look up a category by its slug */
export function getCategoryBySlug(slug: string): CategoryContent | undefined {
  return CATEGORY_CONTENT.find(c => c.slug === slug)
}
