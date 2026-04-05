import { buildMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'WordPress Website Development — AI-Managed, SEO-Optimized | Demand Signals',
  description: 'We build and manage WordPress sites engineered for local search, GEO citations, and lead generation. AI agents keep your content fresh automatically. Serving Northern California.',
  path:        '/services/wordpress',
  keywords: [
    'WordPress development Northern California',
    'AI-managed WordPress site',
    'WordPress SEO El Dorado County',
    'managed WordPress Sacramento',
    'WooCommerce development',
    'WordPress schema markup',
  ],
})

const WHAT_WE_BUILD = [
  {
    icon: '🏢',
    title: 'Business Marketing Sites',
    description:
      'Multi-page WordPress sites with GEO-first content architecture, full schema markup, and lead capture integrated directly with your CRM. Built to rank in Google and get cited in ChatGPT answers.',
  },
  {
    icon: '🛒',
    title: 'WooCommerce Stores',
    description:
      'E-commerce on WordPress with WooCommerce — product catalogs, checkout flows, inventory management, and payment processing. Optimized for product search and conversion.',
  },
  {
    icon: '🔌',
    title: 'Plugin & Integration Dev',
    description:
      'Custom WordPress plugins, ACF field groups, REST API endpoints, and third-party integrations (HubSpot, Stripe, Zapier, Twilio). When off-the-shelf plugins won\'t cut it.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Content Engine',
    description:
      'Our AI agent system connects directly to your WordPress install — researching topics, writing posts, updating service pages, and publishing on schedule. Your site compounds while you run your business.',
  },
  {
    icon: '🔄',
    title: 'Migrations & Rebuilds',
    description:
      'Moving from Wix, Squarespace, or a legacy PHP site? We migrate your content, preserve your SEO equity with proper 301 redirects, and launch you on a clean, fast WordPress stack.',
  },
  {
    icon: '🔒',
    title: 'Managed Hosting & Security',
    description:
      'Verpex managed hosting with Cloudflare CDN, daily backups, malware scanning, and proactive uptime monitoring. You focus on your business — we keep the lights on.',
  },
]

const TECH_STACK = [
  { label: 'CMS',        value: 'WordPress 6.x (Block Editor + Classic)' },
  { label: 'E-commerce', value: 'WooCommerce, WooPayments, Stripe' },
  { label: 'Page Builder', value: 'Gutenberg blocks, ACF Pro, custom PHP' },
  { label: 'Theme',      value: 'Custom-built (no page-builder bloat)' },
  { label: 'Hosting',    value: 'Verpex Managed WordPress + Cloudflare CDN' },
  { label: 'Search',     value: 'Yoast/RankMath + custom schema.org markup' },
  { label: 'AI Layer',   value: 'Claude API → WP REST API content pipelines' },
  { label: 'Analytics',  value: 'GA4 + Google Search Console + PostHog' },
]

export default function WordPressPage() {
  return (
    <>
      <JsonLd data={serviceSchema(
        'WordPress Website Development',
        'AI-managed WordPress sites built for local search, GEO citations, and lead generation.',
        'https://demandsignals.co/services/wordpress',
      )} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home',     url: 'https://demandsignals.co' },
        { name: 'Services', url: 'https://demandsignals.co/services' },
        { name: 'WordPress Sites', url: 'https://demandsignals.co/services/wordpress' },
      ])} />

      <PageHero
        eyebrow="WordPress Development"
        title={<><span style={{color:'#FF6B2B'}}>WordPress Sites</span> That Work<br /><span style={{color:'#52C9A0'}}>While You Sleep.</span></>}
        subtitle="AI-managed WordPress built for local search dominance, GEO citations, and automated lead generation."
        ctaLabel="Build My WordPress Site →"
        ctaHref="/contact"
        callout={<>We connect an <span style={{color:'#52C9A0'}}>AI content engine</span> to every WordPress site we build — so your rankings compound automatically, without you writing a single word.</>}
      />

      {/* What We Build */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              What We Build
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              WordPress Done Right
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {WHAT_WE_BUILD.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 12 }}>
                Our Stack
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>
                Built on Technology,<br />Powered by AI
              </h2>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 20 }}>
                Every WordPress site we build uses a custom theme — no bloated page-builder templates. Clean PHP, performant CSS, and a REST API backend that our AI agents can read and write to automatically.
              </p>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                The AI layer uses the Claude API to research topics, generate SEO-structured content, and publish via the WordPress REST API on a schedule. Your site gets smarter every week without human effort.
              </p>
            </div>
            <div style={{ background: 'var(--light)', borderRadius: 20, padding: '36px' }}>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
              <div style={{ display: 'grid', gap: 0 }}>
                {TECH_STACK.map((row) => (
                  <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #e8ecf0' }}>
                    <strong style={{ color: 'var(--slate)', minWidth: 110, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                    <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              The AI Difference
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              Your WordPress site updates itself.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              After launch, our AI agent swarm takes over content operations. Cyrus researches keyword opportunities, Jasper writes SEO-structured articles and service pages, and Theo deploys them to WordPress via the REST API — all without you touching the admin panel. The result: a site that compounds in authority week over week while you focus on your customers.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready for a WordPress Site That Actually Ranks?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Tell us about your business and we&apos;ll scope a build that fits your market, your goals, and your budget — usually within 48 hours.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              Start My WordPress Build →
            </a>
            <a href="/portfolio" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              See Portfolio
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
