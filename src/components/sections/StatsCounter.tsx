'use client'

import { motion } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'

type Stat = { value: number; suffix?: string; prefix?: string; label: string }

function StatItem({ stat, index }: { stat: Stat; index: number }) {
  const { ref, value } = useCountUp(stat.value, 2000, index * 200)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ textAlign: 'center', flex: 1, minWidth: 140 }}
    >
      <div style={{
        fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
        fontWeight: 800,
        color: '#52C9A0',
        lineHeight: 1.1,
        marginBottom: 8,
      }}>
        {stat.prefix || ''}{value}{stat.suffix || ''}
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}>
        {stat.label}
      </div>
    </motion.div>
  )
}

export function StatsCounter({ stats }: { stats: Stat[] }) {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0d1526 0%, #1a2238 100%)',
      padding: '56px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle teal glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 200,
        background: 'radial-gradient(ellipse, rgba(104,197,173,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1000, margin: '0 auto', position: 'relative',
        display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap',
      }}>
        {stats.map((stat, i) => (
          <StatItem key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: '10%', right: '10%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(104,197,173,0.3), transparent)',
      }} />
    </section>
  )
}
