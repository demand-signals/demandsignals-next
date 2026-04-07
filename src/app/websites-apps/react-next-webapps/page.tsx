import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'React & Next.js Web App Development — AI-Powered | Demand Signals',
  description: 'Full-stack Next.js web applications with AI features, TypeScript, Supabase, and Vercel edge deployment. Custom platforms, dashboards, and tools built for performance.',
  path:        '/websites-apps/react-next-webapps',
  keywords:    ['Next.js development', 'React web apps', 'TypeScript development', 'Supabase apps', 'AI web applications', 'Vercel deployment'],
})

export default function ReactNextPage() {
  return (
    <ServicePageTemplate
        eyebrow="React / Next.js Development"
        titleHtml={<><span style={{color:'#FF6B2B'}}>Next.js Apps</span> With<br /><span style={{color:'#52C9A0'}}>AI Built In.</span></>}
        subtitle="Full-stack web applications on Next.js 16 — TypeScript, Supabase, Claude API, and Vercel edge deployment from day one."
        ctaLabel="Start My Web App →"
        calloutHtml={<>Demand Signals builds every Next.js app with <span style={{color:'#52C9A0'}}>AI features from day one</span> — intelligent search, content generation, and automated workflows. Next.js powers 8 of the top 10 fastest-growing SaaS platforms, and we deploy on Vercel&apos;s edge network across 100+ global locations.</>}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Websites & Apps', path: '/websites-apps' },
          { name: 'React / Next.js Apps', path: '/websites-apps/react-next-webapps' },
        ]}
        schemaName="React & Next.js Web App Development"
        schemaDescription="Full-stack Next.js web applications with AI features, TypeScript, and edge deployment."
        schemaUrl="/websites-apps/react-next-webapps"
        featuresHeading="Cutting-Edge Web Applications Built on React & Next.js"
        features={[
          { icon: '🌐', title: 'Marketing Platforms', description: 'Database-driven marketing sites with dynamic pages, schema markup, and AI content pipelines. This site — demandsignals.co — runs on Next.js.' },
          { icon: '📊', title: 'Client Portals & Dashboards', description: 'Real-time dashboards showing search performance, AI citations, content calendars, and review management. Row-level security with Supabase Auth.' },
          { icon: '🛒', title: 'E-commerce & Booking', description: 'Custom checkout flows, subscription management, and booking systems integrated with Stripe. Faster and more flexible than Shopify.' },
          { icon: '🤖', title: 'AI-Powered Tools', description: 'Internal tools with Claude API integration — document generation, data analysis, research automation, and workflow orchestration.' },
          { icon: '🏗️', title: 'Multi-Tenant Platforms', description: 'SaaS platforms serving multiple clients from a single codebase with tenant isolation, custom domains, and per-client configuration.' },
          { icon: '📱', title: 'Progressive Web Apps', description: 'PWA-enabled web apps that work offline, send push notifications, and install on mobile — without the App Store.' },
        ]}
        techStack={[
          { label: 'Framework', value: 'Next.js 16 (App Router, React 19)' },
          { label: 'Language', value: 'TypeScript (strict mode)' },
          { label: 'Database', value: 'Supabase (PostgreSQL + RLS + Realtime)' },
          { label: 'AI', value: 'Claude API (Sonnet for speed, Opus for complex)' },
          { label: 'Auth', value: 'Supabase Auth (SSO, OAuth, magic links)' },
          { label: 'Payments', value: 'Stripe (subscriptions, invoicing, one-time)' },
          { label: 'Hosting', value: 'Vercel Pro (edge network, zero-config)' },
          { label: 'Styling', value: 'Tailwind CSS + CSS Modules' },
        ]}
        techDescription="Our stack is designed for speed, reliability, and AI integration. Next.js gives us server-side rendering and API routes. Supabase handles data with row-level security. Claude API powers AI features. Vercel deploys to the edge globally."
        stats={[
          { value: 100, suffix: '+', label: 'Vercel Edge Locations' },
          { value: 8, label: 'Top 10 SaaS Platforms on Next.js' },
          { value: 99, suffix: '%', label: 'Target Lighthouse Score' },
          { value: 48, suffix: 'hr', label: 'Project Scoping Turnaround' },
        ]}
        aiCalloutHeading="AI isn't an add-on. It's the architecture."
        aiCalloutText="Every Next.js app we build has AI in the foundation — not bolted on after the fact. Content generation, intelligent search, automated workflows, and structured data pipelines are part of the architecture from sprint one. Your app gets smarter the longer it runs."
        faqs={[
          { question: 'Why Next.js instead of WordPress for my business?', answer: 'Next.js is ideal when you need a custom web application — member portals, dashboards, booking systems, e-commerce with custom logic, or any feature that goes beyond a marketing website. WordPress is better for content-heavy marketing sites. We\'ll recommend the right platform during your free consultation.' },
          { question: 'How long does a Next.js web app take to build?', answer: 'A standard web application takes 4-8 weeks from kickoff to launch. Complex platforms with multiple user roles, AI features, and integrations typically take 8-12 weeks. We ship iteratively — you see working features every week, not a big reveal at the end.' },
          { question: 'Can you integrate AI features into my existing app?', answer: 'Yes. We can add Claude API integrations, automated content pipelines, AI-powered search, and intelligent workflows to existing Next.js, React, or Node.js applications. We audit your current codebase and scope the integration work during a free consultation.' },
          { question: 'What happens after the app launches?', answer: 'We offer ongoing management packages that include AI-powered monitoring, content generation, feature development, and performance optimization. Our domain loop architecture means the app continuously improves — pages are optimized, content is refreshed, and performance issues are caught automatically.' },
        ]}
        ctaHeading="Ready for a Web App That Does More?"
        ctaText="Tell us what you're building and we'll scope the architecture, timeline, and budget within 48 hours."
        ctaPrimaryLabel="Start My App Build →"
        serviceCategory="websites-apps"
      />
  )
}
