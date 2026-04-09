/**
 * Centralized FAQ registry — every FAQ across the entire site,
 * grouped by category/section with source page metadata.
 *
 * Sources:
 *  - Category index pages (websites-apps, demand-generation, etc.)
 *  - Individual service pages (inline faqs={[...]} props)
 *  - About, Portfolio, and Tools pages
 *  - Template-driven FAQs from services.ts (with {city}/{county} vars stripped)
 */

import { SERVICES } from './services'
import { CATEGORY_CONTENT } from './category-content'

// ── Types ─────────────────────────────────────────────────────────

export type FaqEntry = {
  question: string
  answer: string
  sourcePage: string     // e.g. '/websites-apps/wordpress-development'
  sourceLabel: string    // e.g. 'WordPress Development'
}

export type FaqSection = {
  title: string
  slug: string
  pagePath: string
  faqs: FaqEntry[]
  subsections?: FaqSection[]
}

// ── Template variable stripping ───────────────────────────────────

function stripTemplateVars(text: string): string {
  return text
    .replace(/\{city\}/g, 'your area')
    .replace(/\{county\}/g, 'the region')
    .replace(/\{state\}/g, 'your state')
    // Clean up awkward phrasing after replacement
    .replace(/in your area and your area/g, 'in your area')
    .replace(/your area and the region/g, 'your area and surrounding region')
    .replace(/the the region/g, 'the region')
}

// ── About page FAQs ──────────────────────────────────────────────

const ABOUT_FAQS: Array<{ question: string; answer: string }> = [
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
    answer: 'Yes \u2014 and we often work alongside existing teams. We can plug into your current content workflow, amplify your SEO strategy with AI-generated supporting content, add AI search optimization on top of your existing site, or automate specific functions like review management without disrupting what\'s already working. A free intelligence report helps us identify exactly where the gaps are before recommending anything.',
  },
  {
    question: 'What does getting started with Demand Signals look like?',
    answer: 'It starts with a free 30-minute strategy call where we learn about your business, goals, and current marketing situation. From there, we run a free intelligence report that analyzes your search presence, competitor landscape, and top opportunities. You get a clear picture of where you stand and what the highest-ROI moves are \u2014 with no obligation. Most clients are ready to move forward within a week of seeing their report.',
  },
]

// ── Portfolio page FAQs ──────────────────────────────────────────

const PORTFOLIO_FAQS: Array<{ question: string; answer: string }> = [
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
    answer: 'Yes. While many of our clients are based in Northern California \u2014 particularly the Sacramento metro area, El Dorado County, and the Sierra Foothills \u2014 we serve clients across the United States, Thailand, Australia, and beyond. Our AI-powered systems work in any geography, and our strategies are tailored to the specific local market, competitors, and customer behavior of each region we operate in.',
  },
  {
    question: 'How do I get started with Demand Signals?',
    answer: 'The best first step is to book a free strategy call or request a free Demand Audit. The audit gives you a clear picture of your current visibility across Google, Maps, AI assistants, and social media, benchmarked against your local competitors. From there, we build a tailored engagement plan around the highest-impact opportunities. There is no obligation \u2014 the audit and action plan are yours to keep regardless of whether you choose to work with us.',
  },
]

// ── Tools page FAQs ──────────────────────────────────────────────

const TOOLS_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'What free tools does Demand Signals offer?',
    answer: 'We currently offer a free Demand Audit that scans your online presence across Google, Maps, AI assistants, and social media, plus free Intelligence Reports with custom AI-built competitor analysis and market demand mapping. Two additional tools \u2014 Demand Links for AI-powered link intelligence and Dynamic QR for trackable smart QR codes \u2014 are in active development and coming soon.',
  },
  {
    question: 'Are these tools really free, or is there a catch?',
    answer: 'They are genuinely free with no credit card required and no upsell walls. We built them to give local businesses real market intelligence so you can see where you stand before spending a dollar. If the data shows you need help, we are here \u2014 but the tools deliver value on their own regardless of whether you become a client.',
  },
  {
    question: 'How do your free tools differ from generic SEO audit tools?',
    answer: 'Most free audit tools give you a vanity score and a list of technical issues. Our tools are built specifically for local and regional businesses and go beyond traditional SEO. We audit AI visibility across ChatGPT, Gemini, and Perplexity, analyze your Google Business Profile health, benchmark you against real local competitors, and deliver a prioritized action plan \u2014 not just a checklist.',
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

// ── Inline service page FAQs (non-template, from page components) ──

const SERVICE_PAGE_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  'wordpress-development': [
    { question: 'Why WordPress instead of Squarespace or Wix?', answer: 'WordPress powers 43% of the web and offers unmatched flexibility. Unlike Squarespace or Wix, WordPress gives us full control over code, schema markup, server-side rendering, and API integrations. Most importantly, our AI content engine connects directly to WordPress via its REST API \u2014 something closed platforms don\'t support.' },
    { question: 'How does AI content work on WordPress?', answer: 'Our AI system uses the Claude API to research topics and write SEO-structured content, then publishes directly to your WordPress site via the WP REST API on an automated schedule. Every post includes proper categories, tags, featured images, and schema markup. You can review and approve content in your portal before it goes live.' },
    { question: 'Do you build on WordPress.com or self-hosted WordPress?', answer: 'Self-hosted WordPress exclusively. WordPress.com limits plugin access, custom code, and server control. We host on DSIG Managed WordPress cPanel with Cloudflare \u2014 giving you full control, better performance, and the ability to run our AI content pipeline.' },
    { question: 'Can you migrate my existing site to WordPress?', answer: 'Yes. We handle full migrations from any platform \u2014 Wix, Squarespace, Shopify, Joomla, Drupal, or static HTML. We preserve your SEO equity with proper 301 redirects, migrate all content, and rebuild on a clean WordPress stack optimized for search and AI discovery.' },
  ],
  'react-next-webapps': [
    { question: 'Why Next.js instead of WordPress for my business?', answer: 'Next.js is ideal when you need a custom web application \u2014 member portals, dashboards, booking systems, e-commerce with custom logic, or any feature that goes beyond a marketing website. WordPress is better for content-heavy marketing sites. We\'ll recommend the right platform during your free consultation.' },
    { question: 'How long does a Next.js web app take to build?', answer: 'A standard web application takes 4-8 weeks from kickoff to launch. Complex platforms with multiple user roles, AI features, and integrations typically take 8-12 weeks. We ship iteratively \u2014 you see working features every week, not a big reveal at the end.' },
    { question: 'Can you integrate AI features into my existing app?', answer: 'Yes. We can add Claude API integrations, automated content pipelines, AI-powered search, and intelligent workflows to existing Next.js, React, or Node.js applications. We audit your current codebase and scope the integration work during a free consultation.' },
    { question: 'What happens after the app launches?', answer: 'We offer ongoing management packages that include AI-powered monitoring, content generation, feature development, and performance optimization. Our domain loop architecture means the app continuously improves \u2014 pages are optimized, content is refreshed, and performance issues are caught automatically.' },
  ],
  'mobile-apps': [
    { question: 'Why React Native instead of native iOS/Android development?', answer: 'React Native delivers 90% of native performance at 50% of the development cost and timeline. One codebase serves both platforms, meaning features ship faster and bugs get fixed once \u2014 not twice. For most business applications, the performance difference is imperceptible.' },
    { question: 'How long does it take to build a mobile app?', answer: 'A standard mobile app takes 6-10 weeks from kickoff to App Store submission. Complex apps with multiple user roles, payment systems, and AI features may take 10-14 weeks. We ship features iteratively so you see working builds weekly.' },
    { question: 'Can you update the app without going through the App Store?', answer: 'Yes \u2014 Expo supports over-the-air (OTA) updates for JavaScript changes. Bug fixes, content updates, and minor UI changes deploy instantly without App Store review. Only native code changes require a full app update.' },
    { question: 'Do you handle App Store submission and approval?', answer: 'Completely. We prepare all assets (screenshots, descriptions, privacy policies), handle submission to both Apple and Google, manage review feedback, and ensure compliance with platform guidelines. Most apps are approved within 1-3 business days.' },
  ],
  'vibe-coded': [
    { question: 'What is vibe coding?', answer: 'Vibe coding is a development approach where AI tools like Cursor and Claude Code generate production code from natural language descriptions, guided by experienced developers. Instead of writing every line manually, developers describe what they want and AI writes the implementation. The developer reviews, refines, and ships \u2014 dramatically accelerating the development cycle.' },
    { question: 'Are vibe-coded apps production quality?', answer: 'Yes \u2014 when guided by experienced developers. The AI writes code that follows best practices, but the quality depends on the developer reviewing and refining it. Our team has 30 years of development experience \u2014 we know what production code looks like and ensure every app meets that standard.' },
    { question: 'How much do vibe-coded apps cost compared to traditional development?', answer: 'Typically 40-60% less than traditional development because the build timeline is dramatically shorter. A project that would take a traditional agency 8-12 weeks can be completed in 1-3 weeks with vibe coding, which means lower labor costs and faster time-to-value.' },
    { question: 'Can vibe-coded apps scale?', answer: 'Absolutely. The underlying technology is the same \u2014 Next.js, Supabase, Vercel, TypeScript. These are enterprise-grade tools used by companies like Netflix, TikTok, and Notion. The apps scale the same way regardless of how fast they were built.' },
  ],
  'design': [
    { question: 'Do you design for both web and mobile?', answer: 'Yes. Every design project includes responsive layouts for desktop, tablet, and mobile. For mobile apps, we design native iOS and Android patterns that feel platform-appropriate while maintaining brand consistency.' },
    { question: 'Can you work with our existing brand guidelines?', answer: 'Absolutely. We build design systems that extend your existing brand \u2014 matching colors, typography, voice, and visual style. If you don\'t have brand guidelines, we\'ll establish them as part of the design process.' },
    { question: 'Do you only design, or do you also build?', answer: 'We do both. Most clients hire us to design AND build \u2014 the handoff is seamless because the same team handles both. But if you have your own development team, we deliver Figma files with complete specs and design tokens ready for implementation.' },
    { question: 'How many design revisions are included?', answer: 'We work iteratively \u2014 showing you designs early and refining based on feedback. Typically 2-3 rounds of revision per screen. The AI-assisted process means revisions happen faster because we can generate alternatives quickly.' },
  ],
  'hosting': [
    { question: 'Is hosting included in your management packages?', answer: 'Yes. Hosting is included in every monthly management package. You don\'t pay separately for servers, CDN, SSL, or monitoring. One monthly fee covers everything.' },
    { question: 'Can you host sites and apps you didn\'t build?', answer: 'Yes, if they run on compatible technology (Next.js, React, WordPress, Node.js). We\'ll evaluate your existing project and migrate it to our infrastructure if it makes sense. Some legacy applications may require refactoring.' },
    { question: 'What happens if my site goes down?', answer: 'Our monitoring systems detect downtime within 60 seconds and alert our team immediately. Most issues are resolved within minutes due to automated rollback capabilities. Vercel and Cloudflare provide built-in redundancy and failover.' },
    { question: 'Can I move my site away from your hosting later?', answer: 'Yes. Everything we build uses open-source technology and standard deployment practices. There\'s no vendor lock-in. Your code, your data, your domain \u2014 all portable.' },
  ],
  'geo-aeo-llm-optimization': [
    { question: 'What is GEO (Generative Engine Optimization)?', answer: 'GEO optimizes your content so that AI platforms \u2014 ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude \u2014 cite and recommend your business when answering user queries. A page can rank #1 in Google but never get cited by ChatGPT if it lacks the structural elements AI engines prioritize. GEO ensures your content has those elements.' },
    { question: 'What is llms.txt and why do I need it?', answer: 'llms.txt is a curated, markdown-formatted file at your domain root that tells AI systems what your site is about, what your key pages are, and where to find important content. Think of it as a sitemap for AI. Every site Demand Signals builds includes auto-generated llms.txt that updates whenever your content changes.' },
    { question: 'How do you measure AI search visibility?', answer: 'We track AI citation count \u2014 how many times your business is mentioned in AI-generated answers per month. We break this down by platform (ChatGPT, Perplexity, Gemini, Google AI Overviews), trending queries, and competitor comparison. This is shown in your client portal alongside traditional search metrics.' },
    { question: 'Is LLM optimization worth the investment if I already rank well in Google?', answer: 'Yes \u2014 because Google\'s AI Overviews are cannibalizing traditional clicks. When AI Overviews are present, organic click-through rates drop by 61%. Meanwhile, 58.5% of Google searches already end without a click. LLM optimization ensures you capture traffic from the growing AI search channel, not just the declining traditional channel.' },
  ],
  'local-seo': [
    { question: 'How is AI-powered SEO different from traditional SEO?', answer: 'Traditional SEO relies on a consultant checking data monthly and making manual changes. Our AI monitors your Google Search Console data daily, scores every page automatically, identifies ranking opportunities in real-time, and creates optimized content without manual intervention. It\'s the difference between a monthly checkup and 24/7 monitoring.' },
    { question: 'How quickly will I see local SEO results?', answer: 'Most businesses see measurable ranking improvements within 60-90 days. Map Pack (Google Maps) rankings often improve faster \u2014 within 30-45 days. The key advantage of AI-powered SEO is that optimization is continuous, so improvements compound over time rather than plateauing between consultant visits.' },
    { question: 'What areas do you cover for local SEO?', answer: 'We specialize in Northern California \u2014 El Dorado County, Sacramento County, Placer County, Nevada County, and Amador County. However, our AI-powered approach works for any geographic market. The same systems apply whether you serve one city or fifty.' },
    { question: 'Do you build all the location pages for me?', answer: 'Yes. We build programmatic city \u00d7 service pages automatically from your service list and target geography. A plumber serving 10 cities with 5 services gets 50+ unique, optimized pages \u2014 each with original content, FAQs, schema markup, and internal links. All maintained by AI.' },
  ],
  'geo-targeting': [
    { question: 'How many location pages do I need?', answer: 'It depends on your service area and service mix. A business serving 10 cities with 5 services needs approximately 50 longtail pages plus county and city index pages. We analyze search demand to prioritize which combinations to build first.' },
    { question: 'Won\'t Google penalize thin or duplicate content across location pages?', answer: 'Not when done correctly. Our AI generates unique content for every page \u2014 location-specific FAQs, service descriptions with local references, and genuine value for the searcher. Google penalizes template pages with swapped city names. We don\'t do that.' },
    { question: 'How do location pages work with AI search engines?', answer: 'Location pages with proper schema markup and FAQ content are excellent for AI citation. When someone asks ChatGPT \'who is the best plumber in Folsom?\' \u2014 a well-structured location page with specific, citable content is exactly what the AI looks for.' },
    { question: 'How long does it take to build and deploy geo-targeted pages?', answer: 'Our AI generates pages programmatically, so a full deployment of 50-100 location pages typically takes 2-3 weeks from strategy to live. The first week covers territory mapping and keyword research. The second week is content generation, schema markup, and internal linking. Week three is review, deployment, and sitemap submission. Pages start indexing within days of going live.' },
    { question: 'Can geo-targeting work for businesses that serve customers remotely?', answer: 'Yes. Remote service businesses like consultants, SaaS companies, and virtual service providers use geo-targeting to capture location-specific search demand even without a physical presence. The pages target "service + city" queries that buyers actually search \u2014 such as "IT consulting Sacramento" or "virtual bookkeeper Austin." This strategy works because search engines match content relevance, not physical proximity, for service-area businesses.' },
  ],
  'gbp-admin': [
    { question: 'How important is Google Business Profile for local businesses?', answer: 'Critical. GBP drives Map Pack visibility \u2014 the local 3-pack that appears at the top of location-based searches. Businesses with active, optimized GBP profiles receive significantly more calls, direction requests, and website visits than those with bare or inactive profiles.' },
    { question: 'Can I still manage my own GBP while you handle the rest?', answer: 'Absolutely. We handle the ongoing optimization \u2014 posts, review responses, Q&A, attributes \u2014 but you retain full access to your profile. You can post, respond, and update anything at any time. We just ensure nothing falls through the cracks.' },
    { question: 'How do you handle negative reviews?', answer: 'AI drafts a professional, empathetic response that acknowledges the concern without being defensive. You can review and approve the response before it publishes, or enable auto-publish for responses the AI is highly confident about. The goal is always to demonstrate professionalism to future readers.' },
    { question: 'How do GBP posts differ from regular social media posts?', answer: 'Google Business Profile posts appear directly in your business listing on Google Search and Maps \u2014 reaching people who are actively searching for your services, not scrolling a social feed. GBP posts support offers, events, updates, and product highlights with direct call-to-action buttons. Our AI writes posts specifically optimized for GBP format, including relevant keywords that reinforce your local search relevance.' },
    { question: 'What GBP attributes and categories matter most for ranking?', answer: 'Primary category selection is the single most important GBP ranking factor \u2014 it must exactly match your core service. Secondary categories, service descriptions, business attributes (accessibility, payment methods, amenities), and service area definitions all contribute to relevance signals. Our AI audits every available field and keeps them fully populated and accurate, because incomplete profiles consistently lose Map Pack positioning to fully optimized competitors.' },
  ],
  'systems': [
    { question: 'What is a domain loop?', answer: 'A domain loop is a self-reinforcing AI system that monitors a specific business function, reasons about what to do, takes action, and measures results \u2014 continuously. We run three: Website Intelligence (search optimization), Content & Social (content generation), and Reputation (review management). They coordinate through a shared database.' },
    { question: 'How is this different from marketing automation tools like HubSpot?', answer: 'Marketing automation tools require you to set up workflows, write content, and monitor results. Our domain loops do all of that autonomously. The AI writes the content, identifies the opportunities, creates the pages, and monitors the results. You approve \u2014 AI does the rest.' },
    { question: 'What does my involvement look like week to week?', answer: 'About 10 minutes. Log into your portal, approve upcoming content, review performance metrics, and flag anything that needs attention. The AI handles everything else \u2014 research, writing, publishing, optimization, and monitoring.' },
    { question: 'How long does it take for a demand gen system to produce measurable results?', answer: 'Content and social output begin immediately \u2014 you will see published posts and articles within the first week. Search ranking improvements typically appear within 30-60 days as Google indexes new content and recognizes increased publishing frequency. The compounding effect kicks in around month 3-4, when dozens of optimized pages start reinforcing each other and driving consistent organic lead flow.' },
    { question: 'Can demand gen systems integrate with my existing CRM and sales tools?', answer: 'Yes. Our systems connect to HubSpot, Salesforce, Pipedrive, and most CRMs via API integration. Leads generated through forms, calls, or chat are automatically routed into your CRM with full attribution data \u2014 which page they came from, which keyword they searched, and which content they engaged with. This closes the loop between marketing activity and revenue so you can see exactly which AI-driven efforts are producing paying customers.' },
  ],
  'ai-content-generation': [
    { question: 'How does AI content compare to human-written content?', answer: 'When properly structured and reviewed, AI-generated content performs as well or better than human-written content in search. The key is structure \u2014 direct answers, question headers, citable data, and schema markup. AI is excellent at producing this consistently. Human review ensures accuracy, brand alignment, and quality control.' },
    { question: 'How much content do you produce per month?', answer: 'Standard packages include 4-8 blog posts, ongoing service page optimization, and FAQ content per month. Volume scales based on your needs and competitive landscape. Every piece is optimized for both traditional SEO and GEO.' },
    { question: 'Will Google penalize AI-generated content?', answer: 'No. Google has explicitly stated they evaluate content quality, not how it was produced. Their guidelines focus on helpfulness, accuracy, and expertise \u2014 not whether a human or AI wrote it. Our content meets all of Google\'s E-E-A-T standards because it\'s structured, factual, and reviewed by domain experts.' },
    { question: 'What makes GEO-optimized content different from regular SEO content?', answer: 'GEO content is structured specifically for AI citation \u2014 direct-answer opening paragraphs, question-format headers, citable statistics, and FAQ schema markup. Traditional SEO content targets keyword density and backlinks. GEO content targets extractability \u2014 making it easy for ChatGPT, Perplexity, and Gemini to pull your content into their answers. The best part is that GEO-structured content also performs well in traditional Google search.' },
    { question: 'How do you ensure content accuracy in specialized industries?', answer: 'The AI generates content based on verified industry data, your business-specific inputs, and domain research. Every piece goes through a human review workflow before publishing \u2014 you or a designated team member approve the content in your portal. For regulated industries like healthcare or legal, we flag compliance-sensitive language and recommend review by a licensed professional before publication.' },
  ],
  'ai-social-media-management': [
    { question: 'Which social media platforms do you manage?', answer: 'LinkedIn, Facebook, Instagram, X (Twitter), and Google Business Profile. We can add other platforms based on your audience. Content is adapted for each platform\'s format and best practices.' },
    { question: 'How does AI match my brand voice?', answer: 'During onboarding, we analyze your existing content, brand guidelines, and communication style. The AI is trained on these inputs and produces content that matches your voice. Over time, it learns from your feedback \u2014 approvals, edits, and rejections all improve the voice model.' },
    { question: 'Can I still post my own content alongside the AI content?', answer: 'Absolutely. The AI handles the baseline \u2014 consistent, scheduled content that keeps your profiles active. You can post additional content anytime. Many clients post personal updates and behind-the-scenes content while the AI handles educational and promotional content.' },
    { question: 'How does AI-generated social content perform compared to manually created posts?', answer: 'In our deployments, AI-generated posts match or exceed manually created content in engagement metrics because the AI posts consistently and optimizes timing based on when your audience is most active. Manual posting tends to be sporadic \u2014 three posts one week, nothing the next. The AI maintains a steady 5-7 posts per week cadence that algorithms reward with better organic reach over time.' },
    { question: 'Does the AI create visual content or just text posts?', answer: 'The AI generates both. Text posts, image captions, carousel copy, and accompanying graphics are all produced as part of the content calendar. For platforms like Instagram where visuals are primary, the AI creates branded graphics, quote cards, and data visualizations that match your brand colors and style guidelines. You do not need a separate design tool or graphic designer.' },
  ],
  'ai-review-auto-responders': [
    { question: 'Can AI really write good review responses?', answer: 'Yes \u2014 and often better than rushed human responses. AI has unlimited time to craft thoughtful, professional, non-defensive replies. It addresses specific feedback, thanks reviewers by context, and handles criticism diplomatically. Every response is reviewable before publishing if you prefer manual approval.' },
    { question: 'What about negative or fake reviews?', answer: 'Negative reviews get flagged with higher urgency. AI drafts a professional response that acknowledges the concern without being defensive, and alerts you immediately. For suspected fake reviews, we help you file removal requests through Google\'s proper channels.' },
    { question: 'Which review platforms do you monitor?', answer: 'Google Business Profile reviews are the primary focus since they directly impact local rankings. We also monitor Yelp, Facebook, and industry-specific platforms based on your business type.' },
    { question: 'How does responding to reviews impact local search rankings?', answer: 'Google has confirmed that review activity \u2014 including response rate and recency \u2014 is a factor in local search rankings. Businesses that respond to every review signal active management, which Google rewards with better Map Pack positioning. Our AI ensures a 100% response rate with fast turnaround, which is a measurable ranking advantage over competitors who ignore or delay their review responses.' },
    { question: 'Can the AI match my brand voice when responding to reviews?', answer: 'Yes. During onboarding, we analyze your existing communications, brand tone, and preferred response style. The AI is trained on these inputs so responses sound authentically like your business \u2014 whether that is warm and casual or formal and professional. Over time, the model improves based on your edits and approvals, getting closer to your exact voice with every review cycle.' },
  ],
  'ai-auto-blogging': [
    { question: 'What types of blog posts does the AI write?', answer: 'Primarily buyer-intent content \u2014 posts targeting search terms that indicate someone is ready to buy your service. Examples: \'How much does [service] cost in [city]?\', \'Best [service] near [location]\', \'[Service] vs [alternative] \u2014 which is better?\' These drive qualified traffic, not vanity visits.' },
    { question: 'How often does the AI publish?', answer: 'Standard packages include 1-2 posts per week. Each post is 1,000-2,000 words, fully optimized with headings, internal links, FAQ sections, and schema markup. Volume can be increased based on your competitive landscape.' },
    { question: 'Do I need to provide topic ideas?', answer: 'No. The AI researches topics automatically based on your industry, target keywords, competitor content, and search trends. However, you can always suggest specific topics through your portal and the AI will prioritize them.' },
    { question: 'How does AI auto blogging help with AI search engines like ChatGPT?', answer: 'Every blog post is structured with direct-answer paragraphs, question-format headings, and FAQ schema markup \u2014 the exact signals AI search engines use when selecting sources to cite. Over time, a library of 50+ well-structured posts establishes your site as an authoritative source that ChatGPT, Perplexity, and Gemini consistently reference when answering questions in your industry.' },
    { question: 'Can I edit or reject posts before they publish?', answer: 'Yes. Every post goes through your approval portal where you can approve, edit, or reject with one click. Most clients spend about 5-10 minutes per post reviewing the content. If you prefer a fully hands-off approach, you can enable auto-publish for posts that meet a confidence threshold, and the AI will only flag posts it is less certain about for your review.' },
  ],
  'ai-content-repurposing': [
    { question: 'Does repurposed content hurt my SEO?', answer: 'No. Each repurposed version is adapted for its specific platform and format \u2014 it\'s not duplicate content. A social media post extracted from a blog post is a different format, different length, and different context. Search engines understand the difference.' },
    { question: 'How much content do I need to start?', answer: 'Any amount. If you have existing blog posts, we can start repurposing immediately. If you\'re starting from scratch, we\'ll combine this with our AI Auto Blogging service \u2014 AI writes the original content and repurposes it simultaneously.' },
    { question: 'Can I choose which channels to prioritize?', answer: 'Yes. During setup, we identify which channels are most relevant for your audience and business type. A B2B company might prioritize LinkedIn and email. A restaurant might prioritize Instagram and GBP. The AI adapts accordingly.' },
    { question: 'How does the AI adapt content for different platform formats?', answer: 'Each platform has different optimal lengths, tone expectations, and formatting rules. The AI rewrites \u2014 not just truncates \u2014 your content for each channel. A 1,500-word blog post becomes a punchy 280-character tweet, a professional 300-word LinkedIn article, a visual Instagram caption with hashtags, and a concise GBP update. Each version is native to its platform, not a copy-paste job.' },
    { question: 'How quickly are repurposed versions created after the original publishes?', answer: 'Repurposed content is generated within minutes of the original blog post being approved. Social media versions are queued on a staggered schedule over the following days to maximize reach \u2014 typically spreading across 3-5 days rather than dumping everything at once. This cadence keeps your profiles consistently active and avoids overwhelming your audience with the same topic in a single day.' },
  ],
  'ai-automation-strategies': [
    { question: 'How long does an AI strategy engagement take?', answer: 'The initial audit and roadmap typically takes 1-2 weeks. Implementation follows the phased plan \u2014 quick wins in weeks 1-4, core systems in months 1-3, full automation in months 3-6. The pace depends on your business complexity.' },
    { question: 'Do I need technical staff to implement AI?', answer: 'No. We handle the technical implementation. Your team needs to participate in the audit (telling us how things work today) and the change management (adopting new workflows). The technology is fully managed by us.' },
    { question: 'What if AI isn\'t the right solution for my business?', answer: 'We\'ll tell you. Not every process benefits from AI automation. Our audit identifies which functions have clear ROI and which are better left as-is. We\'d rather give honest advice than sell you something that won\'t deliver results.' },
    { question: 'What industries benefit most from AI adoption strategies?', answer: 'Service-based businesses with repetitive marketing, content, and customer communication tasks see the fastest ROI \u2014 construction, legal, healthcare, real estate, and hospitality are consistently strong candidates. Any business spending $5,000+/month on marketing labor or agency retainers typically has multiple high-ROI automation opportunities. We have deployed AI systems across dozens of industries and can benchmark expected results against similar businesses.' },
    { question: 'How do you measure success after the AI roadmap is implemented?', answer: 'Every phase in the roadmap includes specific KPIs \u2014 hours saved per week, cost reduction per function, content output volume, and lead generation metrics. We set baselines during the audit so improvements are measured against real numbers, not estimates. Monthly reports compare pre-AI and post-AI performance for each automated function, giving you clear visibility into return on investment.' },
  ],
  'ai-workforce-automation': [
    { question: 'Which roles can AI realistically replace in 2026?', answer: 'Marketing and content roles are the highest-ROI targets: social media management, content writing, review response, SEO monitoring, email marketing, and basic customer service. We\'ve successfully automated all of these across our client deployments.' },
    { question: 'What about quality? Can AI really match human performance?', answer: 'For structured, repeatable tasks \u2014 yes, and often better. AI produces content more consistently, responds to reviews faster, monitors data more thoroughly, and never has an off day. The key is human oversight for quality control, which requires about 10-15 minutes per week.' },
    { question: 'Will this eliminate jobs at my company?', answer: 'That\'s your decision. Some clients use AI to replace roles they were paying agencies for. Others use it to augment existing staff \u2014 freeing humans for high-value work while AI handles the repetitive tasks. We help you make the right call based on your specific situation.' },
    { question: 'How long does it take to see cost savings from workforce automation?', answer: 'Most clients see measurable savings within the first 30 days. Content and social media automation deliver immediate output, so you can reduce agency spend or reallocate staff in the first month. Full ROI \u2014 including search ranking improvements and lead generation gains \u2014 typically materializes over 60-90 days as the AI systems build momentum and compound results.' },
    { question: 'What level of human oversight is required once AI replaces a role?', answer: 'About 10-15 minutes per week per function. You review AI-generated content in an approval portal, check performance dashboards, and flag anything that needs adjustment. The AI handles research, creation, publishing, and monitoring autonomously. Think of it as managing an employee who does 95% of the work and only needs your sign-off on the remaining 5%.' },
  ],
  'ai-agent-infrastructure': [
    { question: 'What technology stack do you use?', answer: 'Next.js for frontend, Supabase (PostgreSQL) for database and auth, Claude API for intelligence, Vercel for hosting, Cloudflare for DNS/CDN, Stripe for payments, and Resend for email. Total base infrastructure cost: approximately $95-265/month covering all clients.' },
    { question: 'Can you integrate with my existing systems?', answer: 'Yes. We integrate with most business tools via APIs \u2014 CRMs (HubSpot, Salesforce), marketing platforms, booking systems, POS systems, and custom databases. If it has an API, we can connect it.' },
    { question: 'How reliable are AI agent systems?', answer: 'Very \u2014 with proper infrastructure. Our pipeline monitoring tracks every run, catches failures immediately, and alerts us via Telegram. Most issues are resolved before they impact client-facing results. The systems are designed for graceful degradation \u2014 if one component fails, others continue running.' },
    { question: 'How long does it take to set up AI infrastructure from scratch?', answer: 'A baseline system with database, authentication, and one or two pipeline loops typically deploys in 2-3 weeks. More complex builds involving multiple API integrations, custom dashboards, and multi-client isolation take 4-6 weeks. We provision everything on Supabase and Vercel so there is no hardware procurement delay.' },
    { question: 'What happens if an API provider changes their endpoints or pricing?', answer: 'Our pipeline orchestration layer abstracts API calls behind standardized interfaces, so swapping a provider requires changing one integration module rather than rewriting the entire system. We monitor API changelogs for every service we integrate with and proactively update connectors before deprecation deadlines hit. Clients receive a Telegram alert and changelog summary whenever a migration occurs.' },
  ],
  'ai-automated-outreach': [
    { question: 'Isn\'t AI outreach just spam?', answer: 'Not the way we do it. Our AI researches each prospect individually and crafts genuinely personalized messages based on their specific business. It\'s the difference between \'Dear Business Owner\' and \'I noticed your website doesn\'t appear in ChatGPT results for [their service] in [their city] \u2014 here\'s what that\'s costing you.\' Quality, not quantity.' },
    { question: 'What response rates do you see?', answer: 'Typical open rates: 45-65%. Reply rates: 8-15%. These are significantly higher than industry averages because every message is researched and personalized. The AI also optimizes timing and channel selection based on your market\'s response patterns.' },
    { question: 'Can I review messages before they send?', answer: 'Yes. You can review and approve every message, or set confidence thresholds for auto-send. Most clients review the first 2-3 weeks of messages, then enable auto-send for messages the AI is highly confident about.' },
    { question: 'How does AI outreach avoid getting flagged as spam?', answer: 'We enforce strict sending limits, warm up new email domains gradually, and rotate sending accounts to maintain healthy sender reputation scores. Each message is genuinely unique \u2014 not a template with a name swapped \u2014 which keeps spam filters from pattern-matching your outreach. We also monitor deliverability metrics daily and adjust volume or messaging when open rates dip below expected thresholds.' },
    { question: 'How quickly can an AI outreach campaign be launched?', answer: 'Most campaigns go live within 5-7 business days. The first week covers prospect list building, messaging strategy, domain warm-up, and CRM integration. Once the initial sequences are approved, the AI begins sending and optimizing automatically. Clients typically see qualified replies within the first two weeks of active outreach.' },
  ],
  'ai-agent-swarms': [
    { question: 'What is an AI agent swarm?', answer: 'An AI agent swarm is a network of specialized AI agents that handle different business functions, coordinated through a shared database. Each agent has a specific role \u2014 one monitors search, another generates content, another handles reviews. They run 24/7 and report results to your portal.' },
    { question: 'How do agents coordinate with each other?', answer: 'Through a shared Supabase database. When the search intelligence agent finds a keyword opportunity, it creates a record that the content agent picks up and writes a page for. When the reputation agent detects a negative review trend, it informs the content agent to create positive content around that topic. The database is the coordination layer.' },
    { question: 'How many agents do I need?', answer: 'It depends on which functions you want automated. Most clients start with 2-3 agents (content + search + reputation) and add more as they see results. The beauty of the architecture is that agents are modular \u2014 add or remove them based on your needs.' },
    { question: 'How do AI agent swarms communicate with each other?', answer: 'Our agent swarms coordinate through a shared PostgreSQL database and event-driven message queues. Each agent reads from and writes to shared state \u2014 when the content agent publishes a new page, the SEO agent automatically monitors its ranking performance. This coordination happens in real-time without human intervention, and all activity is logged to your dashboard.' },
    { question: 'What happens if one agent in the swarm fails?', answer: 'Each agent operates independently with its own error handling and retry logic, so a failure in one agent does not cascade to the others. If the social media agent encounters an API rate limit, the content and reputation agents continue running normally. Failed runs are logged, you receive a Telegram alert, and the agent automatically retries on its next scheduled cycle.' },
  ],
  'private-llms': [
    { question: 'Which models can you deploy privately?', answer: 'We deploy open-source models like Llama, Mistral, and Phi on your infrastructure. Model selection depends on your use case, hardware, and performance requirements. We recommend the right model during the consultation.' },
    { question: 'What hardware do I need?', answer: 'It depends on the model size and throughput requirements. Small models run on a single GPU server. Larger models may need multi-GPU setups. We can also deploy on private cloud infrastructure (AWS, GCP, Azure) with dedicated instances.' },
    { question: 'How do private LLMs compare to ChatGPT or Claude?', answer: 'For general knowledge tasks, frontier models like Claude and GPT-4 are more capable. For domain-specific tasks with fine-tuning, private models can match or exceed frontier model performance on your specific use case \u2014 while keeping data completely private.' },
    { question: 'What does ongoing maintenance of a private LLM look like?', answer: 'We handle model updates, security patches, performance monitoring, and fine-tuning refreshes as part of our managed service. When new open-source model versions release with better performance, we benchmark them against your current deployment and recommend upgrades when the improvement justifies the migration. Infrastructure costs are fixed and predictable \u2014 no per-token API billing surprises.' },
    { question: 'Can a private LLM be fine-tuned on my company\'s proprietary data?', answer: 'Absolutely \u2014 that is one of the primary advantages. We fine-tune models on your internal documents, customer interactions, product catalogs, and domain terminology so the model understands your business at a level no generic API can match. Fine-tuning typically requires a curated dataset of 500-5,000 examples, which we help you prepare during the onboarding process. The result is a model that speaks your language and understands your industry nuances.' },
  ],
  'clawbot-setup': [
    { question: 'Is web crawling legal?', answer: 'Yes, when done ethically. We respect robots.txt directives, rate limits, and platform terms of service. We crawl publicly available information \u2014 the same information anyone could find by visiting the websites. No hacking, no circumventing access controls.' },
    { question: 'What kind of data can clawbots gather?', answer: 'Publicly available information: competitor pricing, service listings, content updates, directory listings, review data, news mentions, and regulatory filings. We can monitor specific websites on schedule and alert you when changes are detected.' },
    { question: 'How does this feed into my other AI services?', answer: 'Crawled data goes into your Supabase database where other AI agents can use it. The content agent uses competitor analysis to write better content. The search agent uses citation data to identify optimization opportunities. The outreach agent uses prospect research to personalize messages.' },
    { question: 'How frequently do clawbots run and how current is the data?', answer: 'Crawl frequency is configured per data source based on how often the target changes. Competitor pricing pages might be crawled daily, while directory listings are checked weekly. Critical monitoring targets like review platforms can be checked every few hours. All crawled data is timestamped and versioned so you can track changes over time and see exactly when a competitor updated their pricing or services.' },
    { question: 'Can clawbots monitor AI-generated search results like ChatGPT or Perplexity?', answer: 'Yes. We deploy specialized crawlers that query AI search engines with your target keywords and track whether your business is being cited in the responses. This is increasingly important as more buyers use AI search instead of Google. The data feeds into your content strategy \u2014 if AI engines are not citing you for a key term, we know exactly which content to create or optimize to earn that citation.' },
  ],
}

// ── Label lookup for service pages ───────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  'wordpress-development': 'WordPress Development',
  'react-next-webapps': 'React / Next.js Apps',
  'mobile-apps': 'iOS & Android Apps',
  'vibe-coded': 'Vibe Coded Web Apps',
  'design': 'UI/UX Design',
  'hosting': 'Agent & App Hosting',
  'geo-aeo-llm-optimization': 'LLM Optimization',
  'local-seo': 'Local SEO',
  'geo-targeting': 'Geo-Targeting',
  'gbp-admin': 'Google Business Admin',
  'systems': 'Demand Gen Systems',
  'ai-content-generation': 'AI Content Generation',
  'ai-social-media-management': 'AI Social Media Management',
  'ai-review-auto-responders': 'AI Review Auto Responders',
  'ai-auto-blogging': 'AI Auto Blogging',
  'ai-content-repurposing': 'AI Content Repurposing',
  'ai-automation-strategies': 'AI Adoption Strategies',
  'ai-workforce-automation': 'AI Workforce Automation',
  'ai-agent-infrastructure': 'AI Infrastructure',
  'ai-automated-outreach': 'AI Powered Outreach',
  'ai-agent-swarms': 'AI Agent Swarms',
  'private-llms': 'Private LLMs',
  'clawbot-setup': 'Clawbot Setup',
}

// ── Category slug lookup for building paths ──────────────────────

const CATEGORY_PATH: Record<string, string> = {
  'websites-apps': '/websites-apps',
  'demand-generation': '/demand-generation',
  'content-social': '/content-social',
  'ai-services': '/ai-services',
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Returns all FAQs across the site, grouped into hierarchical sections.
 * Each category section includes subsections for each service page.
 * Standalone pages (About, Portfolio, Tools) are top-level sections.
 */
export function getAllFaqSections(): FaqSection[] {
  const sections: FaqSection[] = []

  // 1. Category sections (with service subsections)
  for (const cat of CATEGORY_CONTENT) {
    const catPath = CATEGORY_PATH[cat.slug] ?? `/${cat.slug}`
    const catSection: FaqSection = {
      title: cat.name,
      slug: cat.slug,
      pagePath: catPath,
      faqs: cat.faqs.map(f => ({
        question: f.question,
        answer: f.answer,
        sourcePage: catPath,
        sourceLabel: cat.name,
      })),
      subsections: [],
    }

    // Service subsections — inline FAQs first, then template FAQs
    const categoryServices = SERVICES.filter(s => s.category === cat.slug)
    for (const svc of categoryServices) {
      const svcPath = svc.parentHref
      const label = SERVICE_LABELS[svc.slug] ?? svc.name
      const svcFaqs: FaqEntry[] = []

      // Inline page FAQs (highest priority — hand-written for the page)
      const inlineFaqs = SERVICE_PAGE_FAQS[svc.slug]
      if (inlineFaqs) {
        for (const f of inlineFaqs) {
          svcFaqs.push({
            question: f.question,
            answer: f.answer,
            sourcePage: svcPath,
            sourceLabel: label,
          })
        }
      }

      // Template FAQs (from services.ts, with vars stripped)
      for (const f of svc.faqTemplates) {
        svcFaqs.push({
          question: stripTemplateVars(f.question),
          answer: stripTemplateVars(f.answer),
          sourcePage: svcPath,
          sourceLabel: label,
        })
      }

      if (svcFaqs.length > 0) {
        catSection.subsections!.push({
          title: label,
          slug: svc.slug,
          pagePath: svcPath,
          faqs: svcFaqs,
        })
      }
    }

    sections.push(catSection)
  }

  // 2. About page
  sections.push({
    title: 'About Demand Signals',
    slug: 'about',
    pagePath: '/about',
    faqs: ABOUT_FAQS.map(f => ({
      question: f.question,
      answer: f.answer,
      sourcePage: '/about',
      sourceLabel: 'About',
    })),
  })

  // 3. Portfolio page
  sections.push({
    title: 'Portfolio',
    slug: 'portfolio',
    pagePath: '/portfolio',
    faqs: PORTFOLIO_FAQS.map(f => ({
      question: f.question,
      answer: f.answer,
      sourcePage: '/portfolio',
      sourceLabel: 'Portfolio',
    })),
  })

  // 4. Tools page
  sections.push({
    title: 'Free Tools',
    slug: 'tools',
    pagePath: '/tools',
    faqs: TOOLS_FAQS.map(f => ({
      question: f.question,
      answer: f.answer,
      sourcePage: '/tools',
      sourceLabel: 'Free Tools',
    })),
  })

  return sections
}
