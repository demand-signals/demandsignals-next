'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ParticleCanvas } from './HeroCanvas'
import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'

type PageHeroProps = {
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  ctaLabel?: string
  ctaHref?: string
  callout?: React.ReactNode
}

const wordSpring = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: 0.3 + i * 0.08, duration: 0.6, type: 'spring', stiffness: 120, damping: 14 },
  }),
}

export function PageHero({ eyebrow, title, subtitle, ctaLabel = 'Get a Quote →', ctaHref = '/contact', callout }: PageHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Parallax: content moves up faster, particles stay
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const particleScale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.5, 0.85])

  return (
    <>
    <section
      ref={heroRef}
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
      {/* Particle canvas with parallax zoom */}
      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 10, scale: particleScale }}>
        <ParticleCanvas />
      </motion.div>

      {/* Overlay with scroll-linked opacity */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'linear-gradient(to bottom, rgba(8,14,31,0.5) 0%, rgba(8,14,31,0.7) 100%)',
          opacity: overlayOpacity,
        }}
      />

      {/* Content with parallax lift */}
      <motion.div style={{
        position: 'relative', zIndex: 30, maxWidth: 1200, margin: '0 auto',
        padding: '96px 24px 80px', width: '100%', textAlign: 'center',
        y: contentY,
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Eyebrow — slides down from above */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(82,201,160,0.15)', border: '1px solid rgba(82,201,160,0.3)',
              borderRadius: 100, padding: '6px 16px', marginBottom: 24,
            }}
          >
            <span style={{ color: '#52C9A0', fontSize: '0.85rem', fontWeight: 600 }}>{eyebrow}</span>
          </motion.div>

          {/* Title — spring animation per word */}
          <motion.h1
            initial="hidden"
            animate="visible"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}
          >
            {title}
          </motion.h1>

          {/* Subtitle — fades up after title */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{ fontSize: 'clamp(1rem, 1.6vw, 1.2rem)', color: 'rgba(255,255,255,0.72)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.65 }}
          >
            {subtitle}
          </motion.p>

          {/* CTA buttons — scale in with elastic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8, type: 'spring', stiffness: 150 }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
          >
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
          </motion.div>
        </div>
      </motion.div>
    </section>

    {/* Callout — keyword highlights */}
    {callout && (
      <section style={{ background: 'var(--dark)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.85rem)', fontWeight: 700, color: '#fff', lineHeight: 1.5, margin: 0 }}
          >
            {callout}
          </motion.p>
        </div>
      </section>
    )}
    </>
  )
}
