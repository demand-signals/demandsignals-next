import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'Websites & Apps — AI-Powered Development | Demand Signals',
  description: 'Custom websites, web apps, and mobile apps built with AI-first architecture. WordPress, React/Next.js, vibe-coded apps, and managed hosting. Serving Northern California.',
  path:        '/websites-apps',
  keywords:    ['web development Northern California', 'AI websites', 'React Next.js development', 'WordPress development Sacramento', 'mobile app development', 'vibe coding'],
})

// Order matches the homepage Web Presence spectrum simple → complex,
// then the app dev tier below. UI/UX Design (/websites-apps/design)
// page remains live but is removed from this hub per Hunter 2026-05-13.
const SERVICES = [
  {
    icon: '🌐',
    href: '/websites-apps/free-html-website',
    title: 'Free HTML Sites — Starting FREE',
    description: 'Hand-coded HTML websites built free for your business. AI generates the content; we ship in days. You only pay $20/mo for Verpex PHP hosting (SSL, backups, security included).',
    features: ['Free build — we cover the labor', '$20/mo Verpex PHP hosting', 'AI-generated copy + local SEO', 'Tier up anytime — credits transfer'],
  },
  {
    icon: '⚡',
    href: '/websites-apps/vite-website',
    title: 'Vite Sites — Starting $500',
    description: 'Lightning-fast websites built with Vite — sub-second load times, edge-cached delivery, and the speed that moves you up in local search rankings.',
    features: ['Vite build pipeline', 'Sub-second Core Web Vitals', '$40/mo Vibe hosting', 'React, Vue, or Svelte'],
  },
  {
    icon: '🎨',
    href: '/websites-apps/vibe-coded-website',
    title: 'Vibe Coded Sites — Starting $1,000',
    description: 'AI-built web applications shipped fast — prototype to production in days, not months. Real databases, real deployment, real iteration speed.',
    features: ['AI-assisted development', 'Same-week launches', 'Real Supabase backends', '$40/mo Vibe hosting'],
  },
  {
    icon: '📰',
    href: '/websites-apps/wordpress-website',
    title: 'WordPress w/ Divi — Starting $2,000',
    description: 'AI-managed WordPress sites with Divi page builder, custom themes, WooCommerce, and an AI content pipeline that keeps your site fresh automatically.',
    features: ['Divi visual editor', 'WooCommerce ready', 'AI content pipeline', '$20/mo Verpex hosting'],
  },
  {
    icon: '🚀',
    href: '/websites-apps/react-nextjs-webapp',
    title: 'React / Next.js WebApps — Starting $4,000',
    description: 'Full-stack web applications on Next.js with AI features baked in. TypeScript, Supabase, edge deployment, and Claude API integrations from day one.',
    features: ['Next.js App Router', 'TypeScript (strict)', 'AI features built-in', '$80/mo managed enterprise hosting'],
  },
  {
    icon: '📱',
    href: '/websites-apps/mobile-apps',
    title: 'iOS & Android Apps',
    description: 'Cross-platform mobile apps with React Native and Expo. AI features, push notifications, offline mode, and App Store publishing — one codebase, both stores.',
    features: ['React Native + Expo', 'AI-powered features', 'Push notifications', 'App Store publishing'],
  },
  {
    icon: '🖥️',
    href: '/websites-apps/hosting',
    title: 'Agent & App Hosting',
    description: 'Managed hosting infrastructure on Vercel, Cloudflare, and DSIG. Zero-config deployments, edge CDN, SSL, and automated monitoring for every site and app we build.',
    features: ['Vercel Pro hosting', 'Cloudflare CDN + DNS', 'Automated deployments', '99.99% uptime SLA'],
  },
]

const FAQS = [
  {
    question: 'What results can I realistically expect from a new website?',
    answer: 'A professionally built, AI-optimized site typically delivers measurable improvements within 60–90 days — higher search rankings, more inbound leads, and improved conversion rates from existing traffic. Our clients routinely see first-page local rankings within 90 days and double-digit increases in qualified leads within six months. We back every engagement with real performance reporting, not vanity metrics.',
  },
  {
    question: 'How long until my new site starts generating leads?',
    answer: 'Most sites begin attracting organic traffic within 30–60 days of launch once indexed by Google and AI search engines. Paid and local search results can come even faster. The AI content pipelines we connect to your site keep it fresh and relevant, which accelerates ranking velocity compared to a static site that never updates itself.',
  },
  {
    question: 'Will my website show up in AI search results, not just Google?',
    answer: 'Yes — every site we build is optimized for traditional SEO, Generative Engine Optimization (GEO), and Answer Engine Optimization (AEO). That means structured data, llms.txt, clear semantic markup, and content written to be cited by ChatGPT, Perplexity, Claude, and other AI assistants. Most agencies ignore this entirely. We prioritize it.',
  },
  {
    question: 'Can you build something custom if my business has unique needs?',
    answer: 'Custom is our default. Whether you need a booking system, client portal, AI-powered search, multi-location management, or e-commerce with complex inventory rules — we scope and build exactly what your business requires. We don\'t force clients into templates that almost fit.',
  },
  {
    question: 'What ongoing support do you provide after launch?',
    answer: 'We offer managed services that keep your site performing long after launch — AI-generated content updates, technical SEO maintenance, Core Web Vitals monitoring, security patching, and continuous schema optimization. Think of it less as a website handoff and more as an ongoing intelligence operation working for your business.',
  },
]

export default function WebsitesAppsPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="Websites & Apps"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI-Powered Websites & Apps</span> — <span style={{color:'#FF6B2B'}}>Built to Perform.</span></>}
      subtitle="From WordPress marketing sites to full-stack Next.js platforms and mobile apps — every build includes AI features, GEO optimization, and continuous improvement from day one."
      calloutHtml={<>We don&apos;t build websites that look pretty and sit idle. Every site we ship is <span style={{color:'#52C9A0'}}>actively generating leads</span>, ranking in AI search results, and improving itself — 24 hours a day, 7 days a week.</>}
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="Websites & Apps"
      breadcrumbPath="/websites-apps"
    />
  )
}
