'use client'

import Link from 'next/link'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

const services = [
  {
    icon: '🌐',
    color: '#2563EB',
    eyebrow: 'Websites',
    title: 'High Impact Websites',
    href: '/websites-apps',
    desc: 'WordPress sites, React/Next.js web apps, and Vite-based sites — designed for local search dominance, GEO citations, and automated lead generation.',
  },
  {
    icon: '📱',
    color: '#7C3AED',
    eyebrow: 'Apps',
    title: 'Web & Mobile Apps',
    href: '/websites-apps/mobile-apps',
    desc: 'iOS, Android, and cross-platform apps with React Native. Full-stack web apps with AI features, real-time data, and edge deployment.',
  },
  {
    icon: '✍️',
    color: '#DB2777',
    eyebrow: 'Content',
    title: 'AI Content Generation',
    href: '/content-social/ai-content-generation',
    desc: 'AI writes your blog posts, service pages, and GMB content on autopilot. SEO-structured, GEO-optimized, and published on schedule.',
  },
  {
    icon: '📣',
    color: '#0891B2',
    eyebrow: 'Social',
    title: 'Social Media Automation',
    href: '/content-social/ai-social-media-management',
    desc: 'AI-powered social media management across every platform — 5-7 posts per week, brand-matched voice, zero manual effort.',
  },
  {
    icon: '🤖',
    color: '#059669',
    eyebrow: 'AI & Agents',
    title: 'AI Strategies & Agents',
    href: '/ai-services',
    desc: 'AI adoption roadmaps, workforce automation, agent swarms, and private LLMs — custom-built to run your operations on autopilot.',
  },
]

export function ServicesGrid() {
  return (
    <section aria-labelledby="services-heading" style={{ background: 'var(--light)', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 id="services-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2, margin: 0 }}>
              Everything You Need to{' '}
              <span style={{ color: 'var(--teal)' }}>Dominate Your Market</span>
            </h2>
            <p style={{ color: 'var(--slate)', maxWidth: 640, margin: '20px auto 0', fontSize: '1.05rem', lineHeight: 1.65 }}>
              From brand identity to AI-powered outreach — we build and run the systems that make you impossible to ignore.
            </p>
          </div>
        </ScrollReveal>

        {/* Top row: 3 cards */}
        <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
          {services.slice(0, 3).map(s => (
            <StaggerItem key={s.href}>
              <ServiceCard {...s} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom row: 2 cards centered */}
        <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 800, margin: '0 auto' }}>
          {services.slice(3).map(s => (
            <StaggerItem key={s.href}>
              <ServiceCard {...s} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .services-grid-top, .services-grid-bottom {
            grid-template-columns: 1fr !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </section>
  )
}

function ServiceCard({ icon, color, eyebrow, title, href, desc }: {
  icon: string; color: string; eyebrow: string; title: string;
  href: string; desc: string;
}) {
  return (
    <article style={{
      background: '#fff', borderRadius: 16, padding: '32px 28px',
      border: '1.5px solid #edf0f4', display: 'flex', flexDirection: 'column',
      borderBottom: `4px solid ${color}`,
      transition: 'box-shadow 0.22s, border-color 0.22s, transform 0.22s',
      height: '100%',
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
