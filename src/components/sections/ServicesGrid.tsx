import Link from 'next/link'

const services = [
  {
    icon: '🏛️',
    color: '#FF6B2B',
    eyebrow: 'Digital Presence',
    title: 'Sites & Apps',
    href: '/websites-apps',
    desc: 'WordPress sites, React/Next.js web apps, Vite-based sites, iOS apps, and Android apps — designed, built, and optimized to convert.',
    borderColor: '#52C9A0',
  },
  {
    icon: '🏛️',
    color: '#FF6B2B',
    eyebrow: 'Demand Generation',
    title: 'Demand Generation',
    href: '/demand-generation',
    desc: 'Local SEO, Google Business Profile, geo-targeted content, and demand gen systems that put you in front of buyers when they are ready to act.',
    borderColor: '#FF6B2B',
  },
  {
    icon: '🏛️',
    color: '#FF6B2B',
    eyebrow: 'Content & Social',
    title: 'Content & Social',
    href: '/content-social',
    desc: 'AI-powered content operations, social media management, and brand storytelling — built to keep you visible, credible, and top of mind.',
    borderColor: '#F59E0B',
  },
  {
    icon: '🏛️',
    color: '#52C9A0',
    eyebrow: 'AI Workforce',
    title: 'AI Workforce',
    href: '/ai-services',
    desc: 'AI agent farms, workforce automation, and agent infrastructure — custom-built to run your back office, ops, and client delivery on autopilot.',
    borderColor: '#7B8FE0',
  },
  {
    icon: '🏛️',
    color: '#52C9A0',
    eyebrow: 'AI-Powered Revenue',
    title: 'AI-Powered Revenue',
    href: '/ai-services/ai-automated-outreach',
    desc: 'AI-powered outreach, intelligent client portals, and real-time analytics — the revenue stack that runs while you sleep.',
    borderColor: '#52C9A0',
  },
]

export function ServicesGrid() {
  return (
    <section aria-labelledby="services-heading" style={{ background: 'var(--light)', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 id="services-heading" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.15, margin: 0 }}>
            Everything You Need to{' '}
            <span style={{ color: 'var(--teal)' }}>Dominate Your Market</span>
          </h2>
          <p style={{ color: 'var(--slate)', maxWidth: 640, margin: '20px auto 0', fontSize: '1.05rem', lineHeight: 1.65 }}>
            From brand identity to AI-powered outreach — we build and run the systems that make you impossible to ignore.
          </p>
        </div>

        {/* Top row: 3 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
          {services.slice(0, 3).map(s => (
            <ServiceCard key={s.href} {...s} />
          ))}
        </div>

        {/* Bottom row: 2 cards centered */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 800, margin: '0 auto' }}>
          {services.slice(3).map(s => (
            <ServiceCard key={s.href} {...s} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .services-top-row, .services-bottom-row {
            grid-template-columns: 1fr !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </section>
  )
}

function ServiceCard({ icon, color, eyebrow, title, href, desc, borderColor }: {
  icon: string; color: string; eyebrow: string; title: string;
  href: string; desc: string; borderColor: string;
}) {
  return (
    <article style={{
      background: '#fff', borderRadius: 16, padding: '32px 28px',
      border: '1.5px solid #edf0f4', display: 'flex', flexDirection: 'column',
      borderBottom: `4px solid ${borderColor}`,
      transition: 'box-shadow 0.22s, border-color 0.22s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.4rem', marginBottom: 20,
        color: '#fff',
      }}>
        {icon}
      </div>
      <p style={{
        color, fontWeight: 700, fontSize: '0.75rem',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {eyebrow}
      </p>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>
        {title}
      </h3>
      <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 24, flex: 1 }}>
        {desc}
      </p>
      <Link href={href} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: color, color: '#fff', fontWeight: 700,
        fontSize: '0.85rem', padding: '10px 20px', borderRadius: 100,
        textDecoration: 'none', width: 'fit-content',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}>
        Explore →
      </Link>
    </article>
  )
}
