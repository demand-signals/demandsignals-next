import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'WordPress Website Development — AI-Managed, SEO-Optimized | Demand Signals',
  description: 'We build and manage WordPress sites engineered for local search, GEO citations, and lead generation. AI agents keep your content fresh automatically. Serving Northern California.',
  path:        '/websites-apps/wordpress-development',
  keywords:    ['WordPress development Northern California', 'AI-managed WordPress site', 'WordPress SEO El Dorado County', 'managed WordPress Sacramento', 'WooCommerce development'],
})

export default function WordPressDevelopmentPage() {
  return (
    <ServicePageTemplate
      eyebrow="WordPress Development"
      titleHtml={<><span style={{color:'#FF6B2B'}}>WordPress Sites</span> That Work<br /><span style={{color:'#52C9A0'}}>While You Sleep.</span></>}
      subtitle="AI-managed WordPress built for local search dominance, GEO citations, and automated lead generation."
      ctaLabel="Build My WordPress Site →"
      calloutHtml={<>We connect an <span style={{color:'#52C9A0'}}>AI content engine</span> to every WordPress site we build — so your rankings compound automatically, without you writing a single word.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'WordPress Sites', path: '/websites-apps/wordpress-development' },
      ]}
      schemaName="WordPress Website Development"
      schemaDescription="AI-managed WordPress sites built for local search, GEO citations, and lead generation."
      schemaUrl="/websites-apps/wordpress-development"
      featuresHeading="WordPress Done Right"
      features={[
        { icon: '🏢', title: 'Business Marketing Sites', description: 'Multi-page WordPress sites with GEO-first content architecture, full schema markup, and lead capture integrated with your CRM. Built to rank in Google and get cited in ChatGPT answers.' },
        { icon: '🛒', title: 'WooCommerce Stores', description: 'E-commerce on WordPress with WooCommerce — product catalogs, checkout flows, inventory management, and payment processing. Optimized for product search and conversion.' },
        { icon: '🔌', title: 'Plugin & Integration Dev', description: 'Custom WordPress plugins, ACF field groups, REST API endpoints, and third-party integrations (HubSpot, Stripe, Zapier, Twilio). When off-the-shelf plugins won\'t cut it.' },
        { icon: '🤖', title: 'AI-Powered Content Engine', description: 'Our AI system connects directly to your WordPress install — researching topics, writing posts, updating service pages, and publishing on schedule. Your site compounds while you run your business.' },
        { icon: '🔄', title: 'Migrations & Rebuilds', description: 'Moving from Wix, Squarespace, or a legacy PHP site? We migrate your content, preserve your SEO equity with proper 301 redirects, and launch you on a clean, fast WordPress stack.' },
        { icon: '🔒', title: 'Managed Hosting & Security', description: 'DSIG Managed WordPress cPanel + Cloudflare CDN, daily backups, malware scanning, and proactive uptime monitoring. You focus on your business — we keep the lights on.' },
      ]}
      techStack={[
        { label: 'CMS', value: 'WordPress 6.x (Block Editor + Classic)' },
        { label: 'E-commerce', value: 'WooCommerce, WooPayments, Stripe' },
        { label: 'Page Builder', value: 'DSIG AI, Divi, Elementor' },
        { label: 'Theme', value: 'Custom-built (no page-builder bloat)' },
        { label: 'Hosting', value: 'DSIG Managed WordPress cPanel + Cloudflare' },
        { label: 'Search', value: 'Yoast/RankMath + custom schema.org markup' },
        { label: 'AI Layer', value: 'Claude API → WP REST API content pipelines' },
        { label: 'Analytics', value: 'GA4 + Google Search Console + PostHog' },
      ]}
      techDescription="Every WordPress site we build uses a custom theme — no bloated page-builder templates. Clean PHP, performant CSS, and a REST API backend that our AI agents can read and write to automatically."
      aiCalloutHeading="Your WordPress site updates itself."
      aiCalloutText="After launch, our AI systems take over content operations. They research keyword opportunities, write SEO-structured articles and service pages, and deploy them to WordPress via the REST API — all without you touching the admin panel. The result: a site that compounds in authority week over week while you focus on your customers."
      faqs={[
        { question: 'Why WordPress instead of Squarespace or Wix?', answer: 'WordPress powers 43% of the web and offers unmatched flexibility. Unlike Squarespace or Wix, WordPress gives us full control over code, schema markup, server-side rendering, and API integrations. Most importantly, our AI content engine connects directly to WordPress via its REST API — something closed platforms don\'t support.' },
        { question: 'How does AI content work on WordPress?', answer: 'Our AI system uses the Claude API to research topics and write SEO-structured content, then publishes directly to your WordPress site via the WP REST API on an automated schedule. Every post includes proper categories, tags, featured images, and schema markup. You can review and approve content in your portal before it goes live.' },
        { question: 'Do you build on WordPress.com or self-hosted WordPress?', answer: 'Self-hosted WordPress exclusively. WordPress.com limits plugin access, custom code, and server control. We host on DSIG Managed WordPress cPanel with Cloudflare — giving you full control, better performance, and the ability to run our AI content pipeline.' },
        { question: 'Can you migrate my existing site to WordPress?', answer: 'Yes. We handle full migrations from any platform — Wix, Squarespace, Shopify, Joomla, Drupal, or static HTML. We preserve your SEO equity with proper 301 redirects, migrate all content, and rebuild on a clean WordPress stack optimized for search and AI discovery.' },
      ]}
      ctaHeading="Ready for a WordPress Site That Actually Ranks?"
      ctaText="Tell us about your business and we'll scope a build that fits your market, your goals, and your budget — usually within 48 hours."
      ctaPrimaryLabel="Start My WordPress Build →"
      serviceCategory="websites-apps"
    />
  )
}
