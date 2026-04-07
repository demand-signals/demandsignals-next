'use client'

import { motion } from 'framer-motion'
import { pillStyle } from '@/components/ui/SectionHeading'
import { BOOKING_URL } from '@/lib/constants'

const DEFAULT_BULLETS = [
  'Your site compounds in authority every week — automatically',
  'AI handles the repetitive work, humans handle the strategy',
  'Faster results at a fraction of traditional agency cost',
  'Real-time optimization based on actual search data',
]

export function AnimatedAICallout({
  eyebrow, heading, text, bullets,
}: {
  eyebrow?: string; heading: string; text?: string; bullets?: string[]
}) {
  const items = bullets || DEFAULT_BULLETS

  return (
    <section style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Animated teal glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: -80, right: '15%', width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(104,197,173,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
        >
          <span style={pillStyle}>{eyebrow || 'The AI Difference'}</span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1.3, margin: '14px 0 20px' }}>
            {heading}
          </h2>
          {text && (
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '1rem', margin: '0 0 32px' }}>
              {text}
            </p>
          )}
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {items.map((bullet, i) => (
            <motion.div
              key={bullet}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.12, type: 'spring', stiffness: 300 }}
                style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(104,197,173,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#68c5ad" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </motion.div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{bullet}</span>
            </motion.div>
          ))}
        </div>

        <motion.a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6, type: 'spring' }}
          whileHover={{ scale: 1.05, boxShadow: '0 8px 32px rgba(255,107,43,0.4)' }}
          style={{
            display: 'inline-block', background: '#FF6B2B', color: '#fff', fontWeight: 700,
            padding: '14px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem',
          }}
        >
          See How This Works for You →
        </motion.a>
      </div>
    </section>
  )
}
