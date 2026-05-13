import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Vite Websites — Lightning-Fast Sites Starting at $500 | Demand Signals',
  description: 'Modern Vite-built websites with sub-second load times. React, Vue, or Svelte on edge-cached delivery. Starting at $500 + $40/mo Vibe hosting. Sacramento, El Dorado Hills, Folsom.',
  path:        '/websites-apps/vite-website',
  keywords:    ['Vite website', 'Vite developer Sacramento', 'fast website', 'SPA developer', 'modern website Sacramento', 'Vite site small business'],
})

export default function ViteWebsitePage() {
  return (
    <ServicePageTemplate
      eyebrow="Vite Website"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Vite Websites</span><br /><span style={{color:'#52C9A0'}}>Lightning-Fast by Default.</span></>}
      subtitle="Modern Vite-built websites with sub-second load times. React, Vue, or Svelte on edge-cached delivery. Built for businesses that compete on speed."
      ctaLabel="Get a Vite Quote →"
      ctaHref="/quote"
      calloutHtml={<>Vite produces sites that load in <span style={{color:'#52C9A0'}}>under 500ms</span> — measurably faster than WordPress or page-builder platforms. For local businesses competing in Google rankings, that speed moves you up the page. Serving Sacramento, El Dorado Hills, Folsom, Roseville, Granite Bay, Auburn, Cameron Park, and Northern California.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'Vite Website', path: '/websites-apps/vite-website' },
      ]}
      schemaName="Vite Website Development"
      schemaDescription="Lightning-fast websites and SPAs built with Vite (React, Vue, or Svelte) on edge-cached Vibe hosting. Starting at $500."
      schemaUrl="/websites-apps/vite-website"
      featuresHeading="Why Vite Wins"
      features={[
        { icon: '⚡', title: 'Sub-Second Load Times', description: 'Vite produces highly-optimized bundles with code-splitting, tree-shaking, and modern ES module loading. Result: pages that load in under 500ms — 4–8× faster than typical WordPress.' },
        { icon: '🌍', title: 'Edge-Cached Delivery', description: 'Static assets served from our Vibe hosting tier ($40/mo), cached at edge locations worldwide. Your nearest customer is always microseconds from your content.' },
        { icon: '🧰', title: 'React, Vue, or Svelte', description: 'Choose your framework. Vite supports all three first-class. We typically default to React for SMB compatibility, but Vue or Svelte work great for sites that need lighter bundles.' },
        { icon: '📐', title: 'Local Schema + SEO', description: 'Pre-rendered HTML for every route so Google crawlers and AI search engines see your content instantly. Local schema markup, Open Graph tags, and structured data baked in from the start.' },
        { icon: '🛠️', title: 'Developer Speed = Your Speed', description: 'Vite\'s instant hot-reload lets us iterate 5–10× faster than WordPress development. Translation: your launch happens in 1–3 weeks, not 6–12.' },
        { icon: '🔄', title: 'Admin Hours for Updates', description: 'Updates go through our Admin Hours packages — 4 hours/$100/mo (Starter) up to 40 hours/$1,000/mo (Agency). Most small businesses on Vite take Growth (8 hours/$200/mo).' },
      ]}
      stats={[
        { value: 500, prefix: '$', label: 'Build starting price' },
        { value: 40, prefix: '$', suffix: '/mo', label: 'Vibe hosting' },
        { value: 500, suffix: 'ms', label: 'Typical load time' },
        { value: 100, suffix: '/100', label: 'Lighthouse perf score' },
      ]}
      techStack={[
        { label: 'Build tool', value: 'Vite 5.x' },
        { label: 'Framework', value: 'React, Vue, or Svelte (your choice)' },
        { label: 'Language', value: 'TypeScript (strict)' },
        { label: 'Hosting', value: 'DSIG Vibe ($40/mo) — edge-cached' },
        { label: 'CDN', value: 'Cloudflare global edge network' },
        { label: 'SSL + Backups', value: 'Automatic, daily, included' },
      ]}
      aiCalloutEyebrow="Faster Than the Competition"
      aiCalloutHeading="Why Vite Beats WordPress on Speed"
      aiCalloutText="A typical WordPress site loads in 2–4 seconds. A Vite site loads in under 500ms. Google measures page speed as a ranking factor, so that difference moves you up in search results — directly translating to more leads."
      aiCalloutBullets={[
        '4–8× faster Time to First Byte',
        'Code-splitting + tree-shaking by default',
        'Edge-cached static assets, sub-second global delivery',
        'Better Core Web Vitals scores → higher Google rankings',
      ]}
      faqs={[
        { question: 'What is a Vite website?', answer: 'Vite is a modern build tool that produces highly-optimized JavaScript bundles. It loads sites in under 500ms — measurably faster than WordPress or page-builder platforms. For businesses competing for local search rankings, page speed is a direct Google ranking factor. A Vite site moves you up the page.' },
        { question: 'How much does a Vite website cost?', answer: 'Vite websites start at $500 for a single-page site and run $1,500–3,000 for multi-page sites with custom interactivity. This includes the Vite build pipeline, mobile-responsive design, local schema markup, and deployment on our Vibe hosting tier ($40/mo).' },
        { question: 'When should I choose Vite over WordPress?', answer: 'Choose Vite when speed is critical and you don\'t need a visual content editor — landing pages, portfolios, service-business sites with static content. Choose WordPress when staff need to edit pages without developer involvement, or you need a blog, e-commerce, or member areas. Most restaurants, salons, contractors, and professional services do beautifully on Vite at half the WordPress price.' },
        { question: 'How fast can you ship a Vite website?', answer: 'Most Vite sites launch in 1–3 weeks from quote acceptance. The Vite developer experience lets us iterate 5–10× the speed of WordPress development. Add a few days for custom design and content review and you have a production-ready site that out-performs your competitors on page speed.' },
        { question: 'Do I own the site?', answer: 'Yes. The code is yours; you can take it with you anytime. We host on our Vibe tier ($40/mo) because Vite sites work best with edge caching, but you\'re free to move it anywhere at any time.' },
        { question: 'How do updates work?', answer: 'Vite sites are developer-edited (not WordPress-style visual editing). Text and image updates go through our Admin Hours packages — starting at $100/mo for 4 hours, up to $1,000/mo for 40 hours. Pay-as-you-go at $50/hr also available. If you need WordPress-style editing, we can tier you over.' },
        { question: 'Vite vs. React/Next.js — what\'s the difference?', answer: 'Vite is a build tool; Next.js is a full-stack framework. Choose Vite when you mostly need fast static delivery (marketing sites, SPAs, dashboards). Choose Next.js when you need server-side rendering, API routes, complex auth, or a full database-backed application. Our React/Next.js tier starts at $4,000 + $80/mo managed hosting — built for businesses with real backend requirements.' },
        { question: 'How do I get started?', answer: 'Run our 5-minute AI quote — it researches your business, proposes a Vite scope, and books a 15-min call to confirm direction. Most Vite sites launch within 1–3 weeks of acceptance.' },
      ]}
      ctaHeading="Ready to Ship Faster?"
      ctaText="Get a 5-minute AI quote that researches your business, proposes a Vite scope, and books a 15-min call. Vite sites typically launch within 1–3 weeks of acceptance."
      ctaPrimaryLabel="Get a Vite Quote →"
      ctaPrimaryHref="/quote"
      ctaSecondaryLabel="See Free HTML Tier"
      ctaSecondaryHref="/websites-apps/free-html-website"
    />
  )
}
