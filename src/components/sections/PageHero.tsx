'use client'
import { ParticleCanvas } from './HeroCanvas'
import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'

type PageHeroProps = {
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  ctaLabel?: string
  ctaHref?: string
}

export function PageHero({ eyebrow, title, subtitle, ctaLabel = 'Get a Quote →', ctaHref = '/contact' }: PageHeroProps) {
  return (
    <section
      aria-label="Page hero"
      style={{
        minHeight: '52vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#080e1f',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <ParticleCanvas />

      {/* Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'linear-gradient(to bottom, rgba(8,14,31,0.5) 0%, rgba(8,14,31,0.7) 100%)',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 30, maxWidth: 1200, margin: '0 auto', padding: '96px 24px 80px', width: '100%', textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(82,201,160,0.15)', border: '1px solid rgba(82,201,160,0.3)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 24,
          }}>
            <span style={{ color: '#52C9A0', fontSize: '0.85rem', fontWeight: 600 }}>{eyebrow}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}>
            {title}
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.2rem)', color: 'rgba(255,255,255,0.72)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.65 }}>
            {subtitle}
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href={ctaHref} style={{
              display: 'inline-flex', alignItems: 'center', padding: '14px 32px',
              background: '#FF6B2B',
              color: '#fff', fontWeight: 700, fontSize: '1rem', borderRadius: 100,
              boxShadow: '0 4px 24px rgba(255,107,43,0.35)', textDecoration: 'none',
            }}>
              {ctaLabel}
            </Link>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={{
              display: 'inline-flex', alignItems: 'center', padding: '13px 30px',
              border: '2px solid rgba(255,255,255,0.5)', color: '#fff',
              background: 'rgba(255,255,255,0.15)',
              fontWeight: 600, fontSize: '1rem', borderRadius: 100, textDecoration: 'none',
            }}>
              Book a Free Call
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
