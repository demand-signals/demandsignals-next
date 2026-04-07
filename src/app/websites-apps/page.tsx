import { buildMetadata } from '@/lib/metadata'
import { CategoryIndexTemplate } from '@/components/templates/CategoryIndexTemplate'

export const metadata = buildMetadata({
  title:       'Websites & Apps — AI-Powered Development | Demand Signals',
  description: 'Custom websites, web apps, and mobile apps built with AI-first architecture. WordPress, React/Next.js, vibe-coded apps, and managed hosting. Serving Northern California.',
  path:        '/websites-apps',
  keywords:    ['web development Northern California', 'AI websites', 'React Next.js development', 'WordPress development Sacramento', 'mobile app development', 'vibe coding'],
})

const SERVICES = [
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
    description: 'AI-built web applications shipped fast using Cursor, Claude Code, Lovable, and Base44. Prototype to production in days — not months.',
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
