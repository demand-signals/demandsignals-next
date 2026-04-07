'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const mobileScores = [
  { label: 'Performance', value: 97 },
  { label: 'Accessibility', value: 94 },
  { label: 'Best Practices', value: 100 },
  { label: 'SEO', value: 100 },
]

const desktopScores = [
  { label: 'Performance', value: 100 },
  { label: 'Accessibility', value: 94 },
  { label: 'Best Practices', value: 100 },
  { label: 'SEO', value: 100 },
]

const mobileMetrics = [
  { label: 'First Contentful Paint', value: '1.2s', good: true },
  { label: 'Largest Contentful Paint', value: '2.6s', good: false },
  { label: 'Total Blocking Time', value: '60ms', good: true },
  { label: 'Cumulative Layout Shift', value: '0', good: true },
  { label: 'Speed Index', value: '1.3s', good: true },
]

const desktopMetrics = [
  { label: 'First Contentful Paint', value: '0.3s', good: true },
  { label: 'Largest Contentful Paint', value: '0.6s', good: true },
  { label: 'Total Blocking Time', value: '0ms', good: true },
  { label: 'Cumulative Layout Shift', value: '0', good: true },
  { label: 'Speed Index', value: '0.4s', good: true },
]

function scoreColor(value: number) {
  if (value >= 90) return '#0cce6b'
  if (value >= 50) return '#ffa400'
  return '#f33'
}

function ScoreRing({ value, label, size = 72, delay = 0, inView }: {
  value: number; label: string; size?: number; delay?: number; inView: boolean
}) {
  const radius = (size / 2) - 5
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = scoreColor(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <motion.circle
            cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={inView ? { strokeDashoffset: offset } : {}}
            transition={{ duration: 1.1, delay: delay + 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        </svg>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: delay + 0.7 }}
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 800, color,
          }}
        >
          {value}
        </motion.div>
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textAlign: 'center' }}>
        {label}
      </span>
    </motion.div>
  )
}

function SummaryRing({ value, inView, delay = 0 }: { value: number; inView: boolean; delay?: number }) {
  const color = scoreColor(value)
  const labels = [
    { text: 'FCP', x: 100, y: 8 },
    { text: 'LCP', x: 178, y: 68 },
    { text: 'TBT', x: 155, y: 160 },
    { text: 'CLS', x: 32, y: 160 },
    { text: 'SI', x: 14, y: 68 },
  ]

  const radius = 68
  const circumference = 2 * Math.PI * radius
  const segmentLength = circumference * 0.17
  const gapLength = circumference * 0.03
  const dashPattern = `${segmentLength} ${gapLength}`
  const filledLength = circumference * (value / 100)

  return (
    <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7"
          strokeDasharray={dashPattern} transform="rotate(-126 100 100)" />
        <motion.circle
          cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={inView ? { strokeDasharray: `${filledLength} ${circumference}` } : {}}
          transition={{ duration: 1.4, delay: delay + 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          transform="rotate(-126 100 100)"
        />
        {labels.map(l => (
          <text key={l.text} x={l.x} y={l.y} textAnchor="middle"
            fill="#9ca3af" fontSize="10" fontWeight="600" fontFamily="inherit">
            {l.text}
          </text>
        ))}
      </svg>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4, delay: delay + 0.9 }}
        style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      </motion.div>
      <div style={{ textAlign: 'center', marginTop: -4 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Performance</span>
      </div>
    </div>
  )
}

function DeviceCard({ title, icon, scores, metrics, perfScore, cardDelay, inView }: {
  title: string; icon: React.ReactNode
  scores: typeof mobileScores; metrics: typeof mobileMetrics; perfScore: number
  cardDelay: number; inView: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: cardDelay, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        flex: 1, minWidth: 320, border: '1px solid #e5e7eb',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        {icon}
        <span style={{ color: '#111827', fontWeight: 700, fontSize: '1.1rem' }}>{title}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, padding: '0 4px' }}>
        {scores.map((s, i) => (
          <ScoreRing key={s.label} value={s.value} label={s.label} delay={cardDelay + 0.1 + i * 0.08} inView={inView} />
        ))}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24,
        alignItems: 'center', borderTop: '1px solid #f0f2f5', paddingTop: 24,
      }}>
        <SummaryRing value={perfScore} inView={inView} delay={cardDelay + 0.2} />

        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Core Web Vitals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.35, delay: cardDelay + 0.4 + i * 0.07 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.good ? '#0cce6b' : '#ffa400', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: '#6b7280', flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: m.good ? '#0cce6b' : '#ffa400' }}>{m.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f2f5' }}>
        {[
          { color: '#f33', label: '0-49' },
          { color: '#ffa400', label: '50-89' },
          { color: '#0cce6b', label: '90-100' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
  </svg>
)

const DesktopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

export default function LighthouseScores() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} style={{ background: 'var(--dark)', padding: '80px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <span style={{
            display: 'inline-block', background: 'rgba(12, 206, 107, 0.15)', color: '#0cce6b',
            padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            Google Lighthouse Audit
          </span>
          <h2 style={{
            color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800, lineHeight: 1.2, marginBottom: 16,
          }}>
            Green Scores Rank Higher. We Build Green.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: 680, margin: '0 auto' }}>
            Google uses Chrome Lighthouse audits as a direct ranking signal. Sites that score green across Performance, Accessibility, Best Practices, and SEO get preferential treatment in search results. Most agencies deliver sites scoring 40-60. We ship 90+.
          </p>
        </motion.div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
          <DeviceCard title="Mobile" icon={<PhoneIcon />} scores={mobileScores} metrics={mobileMetrics} perfScore={97} cardDelay={0.1} inView={inView} />
          <DeviceCard title="Desktop" icon={<DesktopIcon />} scores={desktopScores} metrics={desktopMetrics} perfScore={100} cardDelay={0.25} inView={inView} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(12, 206, 107, 0.08)', border: '1px solid rgba(12, 206, 107, 0.2)',
            borderRadius: 8, padding: '8px 16px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0cce6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span style={{ color: '#0cce6b', fontSize: '0.8rem', fontWeight: 600 }}>
              Live audit of dsig.demandsignals.dev — April 2026
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
