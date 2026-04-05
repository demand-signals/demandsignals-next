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
    question: 'What platform should I choose — WordPress or Next.js?',
    answer: 'WordPress is ideal for content-heavy marketing sites, blogs, and e-commerce stores where non-technical staff need to update content. Next.js is better for custom web applications, platforms with user accounts, and businesses that need high performance and AI features deeply integrated. We\'ll recommend the right platform based on your business goals during your free consultation.',
  },
  {
    question: 'How long does it take to build a website or app?',
    answer: 'A standard WordPress marketing site takes 2-4 weeks. A Next.js web application takes 4-8 weeks depending on complexity. Vibe-coded apps can be prototyped in days and production-ready in 1-2 weeks. Mobile apps typically take 6-10 weeks including App Store submission.',
  },
  {
    question: 'Do you build websites that work with AI search engines like ChatGPT?',
    answer: 'Yes — every site we build includes GEO (Generative Engine Optimization) from day one. This means structured data, FAQ schema, llms.txt files, and content architecture designed to be cited by ChatGPT, Perplexity, Gemini, and Google AI Overviews. This is built into every project, not an add-on.',
  },
  {
    question: 'What does hosting cost for a Demand Signals website?',
    answer: 'Hosting is included in our monthly management fee. We use enterprise-grade infrastructure — Vercel Pro for Next.js sites, DSIG managed WordPress hosting, and Cloudflare CDN for all projects. You never deal with server management, SSL certificates, or uptime monitoring.',
  },
]

export default function WebsitesAppsPage() {
  return (
    <CategoryIndexTemplate
      eyebrow="Websites & Apps"
      titleHtml={<><span style={{color:'#52C9A0'}}>AI-Powered Websites & Apps</span> — <span style={{color:'#FF6B2B'}}>Built to Perform.</span></>}
      subtitle="From WordPress marketing sites to full-stack Next.js platforms and mobile apps — every build includes AI features, GEO optimization, and continuous improvement from day one."
      services={SERVICES}
      faqs={FAQS}
      breadcrumbName="Websites & Apps"
      breadcrumbPath="/websites-apps"
    />
  )
}
