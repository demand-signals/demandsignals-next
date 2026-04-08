'use client'

import Link from 'next/link'
import { ScrollReveal } from '@/components/motion/ScrollReveal'

const flavors = [
  { icon: '🌐', label: 'Static HTML/CSS', color: '#E5793A', sub: 'Clean, hand-coded sites', href: '/websites-apps' },
  { icon: '⚡', label: 'Vite Sites', color: '#646CFF', sub: 'Fast static sites & SPAs', href: '/websites-apps' },
  { icon: '🎨', label: 'Vibe Coded', color: '#DB2777', sub: 'AI-generated presences', href: '/websites-apps/vibe-coded' },
  { icon: '📰', label: 'WordPress', color: '#21759B', sub: 'Proven CMS solutions', href: '/websites-apps/wordpress-development' },
  { icon: '🚀', label: 'React / Next.js', color: '#0891B2', sub: 'Full-stack web apps', href: '/websites-apps/react-next-webapps' },
]

export default function WebPresenceV1() {
  return (
    <section style={{ background: '#fff', padding: '96px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{
              display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)',
              padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Every Stack. Every Scale.
            </span>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800,
              color: 'var(--dark)', lineHeight: 1.2, margin: '14px 0 20px',
            }}>
              We Build Every Flavor of{' '}
              <span style={{ color: 'var(--teal)' }}>Web Presence</span>
            </h2>
            <p style={{
              color: 'var(--slate)', maxWidth: 760, margin: '0 auto',
              fontSize: '1.05rem', lineHeight: 1.7,
            }}>
              From quick-loading Vite sites to cutting-edge React/Next.js apps — simple or complex, greenfield or rescue mission. Behind schedule? Outdated? Webmaster limbo? We get you back on-track. Fractional webmaster services, rethemes, overhauls, or complete rebuilds — designed for <strong style={{ color: 'var(--dark)' }}>SEO, GEO, AEO &amp; Local Search</strong>.
            </p>
          </div>
        </ScrollReveal>

        {/* Horizontal spectrum bar */}
        <ScrollReveal direction="up" delay={0.1}>
          <div style={{ position: 'relative', marginBottom: 64 }}>
            {/* Gradient track */}
            <div style={{
              height: 6, borderRadius: 3,
              background: 'linear-gradient(90deg, #E5793A 0%, #646CFF 25%, #DB2777 50%, #21759B 75%, #0891B2 100%)',
              marginBottom: 0,
            }} />

            {/* Labels row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 12 }}>Simple</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 12 }}>Complex</span>
            </div>

            {/* Flavor stops */}
            <div className="wp-v1-stops" style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0,
              marginTop: 32,
            }}>
              {flavors.map((f, i) => (
                <Link key={f.label} href={f.href} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    textAlign: 'center', position: 'relative', padding: '0 8px',
                  }}>
                    {/* Dot on track */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: f.color,
                      border: '3px solid #fff', boxShadow: `0 0 0 2px ${f.color}40, 0 2px 8px ${f.color}30`,
                      margin: '-52px auto 16px',
                    }} />
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>{f.icon}</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>{f.label}</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: 0, lineHeight: 1.5 }}>{f.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .wp-v1-stops { grid-template-columns: repeat(3, 1fr) !important; gap: 28px !important; }
          .wp-v1-stops > a > div > div:first-child { margin-top: 0 !important; }
        }
        @media (max-width: 768px) {
          .wp-v1-stops { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .wp-v1-stops { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
