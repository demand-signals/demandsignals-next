'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export function AnimatedCTA({
  heading, text, primaryLabel, primaryHref = '/contact',
  secondaryLabel, secondaryHref = '/portfolio',
}: {
  heading: string; text: string; primaryLabel: string
  primaryHref?: string; secondaryLabel?: string; secondaryHref?: string
}) {
  const ctaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ctaRef,
    offset: ['start end', 'end end'],
  })
  const ctaHue = useTransform(scrollYProgress, [0, 1], [0, 15])
  const filterValue = useTransform(ctaHue, v => `hue-rotate(${v}deg)`)

  return (
    <motion.section
      ref={ctaRef}
      style={{
        background: 'linear-gradient(135deg, #FF6B2B 0%, #ff8f5a 50%, #FF6B2B 100%)',
        padding: '80px 24px', textAlign: 'center' as const,
        filter: filterValue,
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <motion.h2
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}
        >
          {heading}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, marginBottom: 32, fontSize: '1.05rem' }}
        >
          {text}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' as const }}
        >
          <motion.a
            href={primaryHref}
            whileHover={{ scale: 1.05 }}
            style={{
              background: 'var(--dark)', color: '#fff', fontWeight: 700, padding: '15px 32px',
              borderRadius: 100, textDecoration: 'none', fontSize: '1rem',
            }}
          >
            {primaryLabel}
          </motion.a>
          {secondaryLabel && (
            <motion.a
              href={secondaryHref}
              whileHover={{ scale: 1.05 }}
              style={{
                background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600,
                padding: '15px 32px', borderRadius: 100, textDecoration: 'none',
                border: '2px solid rgba(255,255,255,0.6)', fontSize: '1rem',
              }}
            >
              {secondaryLabel}
            </motion.a>
          )}
        </motion.div>
      </div>
    </motion.section>
  )
}
