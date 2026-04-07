'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const CARD_ACCENTS = [
  { accent: '#2563EB', iconBg: 'rgba(37,99,235,0.08)' },
  { accent: '#7C3AED', iconBg: 'rgba(124,58,237,0.08)' },
  { accent: '#DB2777', iconBg: 'rgba(219,39,119,0.08)' },
  { accent: '#0891B2', iconBg: 'rgba(8,145,178,0.08)' },
  { accent: '#059669', iconBg: 'rgba(5,150,105,0.08)' },
  { accent: '#D97706', iconBg: 'rgba(217,119,6,0.08)' },
]

type Feature = { icon: string; title: string; description: string }

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const palette = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const Icon = require('@/lib/icons').getIcon(feature.icon)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: 0.06 * index, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '28px 24px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.3s',
      }}
    >
      {/* Accent line at top */}
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 3,
        background: `linear-gradient(90deg, ${palette.accent}, ${palette.accent}44)`,
        borderRadius: '0 0 3px 3px',
      }} />

      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: palette.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        {Icon ? (
          <Icon size={22} strokeWidth={1.5} color={palette.accent} />
        ) : (
          <span style={{ fontSize: '1.3rem' }}>{feature.icon}</span>
        )}
      </div>

      <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.02rem', marginBottom: 8, lineHeight: 1.3 }}>
        {feature.title}
      </h3>
      <p style={{ color: 'var(--slate)', lineHeight: 1.6, fontSize: '0.88rem', margin: 0 }}>
        {feature.description}
      </p>
    </motion.div>
  )
}

export function FeatureGrid({ eyebrow, heading, features }: {
  eyebrow: string; heading: string; features: Feature[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  // First feature becomes the intro text, rest become cards
  const introFeature = features[0]
  const cardFeatures = features.slice(1)
  const bottomRow = cardFeatures.length > 3 ? cardFeatures.slice(3) : []
  const topRow = cardFeatures.slice(0, 3)

  return (
    <section ref={ref} style={{
      padding: '80px 24px 88px',
      position: 'relative', overflow: 'hidden',
      backgroundColor: '#f8fafb',
      backgroundImage: 'radial-gradient(circle, rgba(104,197,173,0.1) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }}>
      {/* Gradient mesh */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 70% 10%, rgba(104,197,173,0.06) 0%, transparent 50%), radial-gradient(ellipse at 20% 90%, rgba(242,133,0,0.03) 0%, transparent 50%)',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <span style={{
            display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad',
            padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {eyebrow}
          </span>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800,
            color: 'var(--dark)', margin: '14px 0 0', lineHeight: 1.2,
          }}>
            {heading}
          </h2>
        </motion.div>

        {/* Intro — first feature as a text intro strip, not a heavy dark box */}
        {introFeature && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '24px 32px', marginBottom: 28,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(29,35,48,0.04) 0%, rgba(104,197,173,0.06) 100%)',
              borderLeft: '4px solid #68c5ad',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(104,197,173,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {(() => { const I = require('@/lib/icons').getIcon(introFeature.icon); return I ? <I size={24} strokeWidth={1.5} color="#68c5ad" /> : <span style={{ fontSize: '1.4rem' }}>{introFeature.icon}</span> })()}
            </div>
            <div>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>
                {introFeature.title}
              </h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {introFeature.description}
              </p>
            </div>
          </motion.div>
        )}

        {/* Top row — 3 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: bottomRow.length > 0 ? 24 : 0 }}>
          {topRow.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>

        {/* Bottom row — centered */}
        {bottomRow.length > 0 && (
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            {bottomRow.map((feature, i) => (
              <div key={feature.title} style={{ flex: '0 1 calc(33.333% - 16px)', maxWidth: 'calc(33.333% - 16px)' }}>
                <FeatureCard feature={feature} index={i + 3} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
