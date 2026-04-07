'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { getIcon } from '@/lib/icons'

const CARD_ACCENTS = [
  '#2563EB', '#7C3AED', '#DB2777', '#0891B2', '#059669', '#D97706',
]

type Feature = { icon: string; title: string; description: string }

function FeatureContent({ feature, index, direction }: { feature: Feature; index: number; direction: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const Icon = getIcon(feature.icon)

  return (
    <motion.div
      key={feature.title}
      initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
        style={{
          width: 64, height: 64, borderRadius: 16,
          background: `${accent}14`,
          border: `2px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        {Icon ? (
          <Icon size={30} strokeWidth={1.5} color={accent} />
        ) : (
          <span style={{ fontSize: '1.8rem' }}>{feature.icon}</span>
        )}
      </motion.div>

      {/* Number badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginBottom: 16,
        }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700,
        }}>
          {index + 1}
        </span>
        <span style={{ color: accent, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Feature {index + 1} of 6
        </span>
      </motion.div>

      <h3 style={{
        color: 'var(--dark)', fontWeight: 800,
        fontSize: 'clamp(1.4rem, 3vw, 2rem)',
        lineHeight: 1.2, marginBottom: 16,
      }}>
        {feature.title}
      </h3>

      <p style={{
        color: 'var(--slate)', lineHeight: 1.75,
        fontSize: '1.05rem', margin: 0, maxWidth: 480,
      }}>
        {feature.description}
      </p>
    </motion.div>
  )
}

export function FeatureShowcase({ eyebrow, heading, features }: {
  eyebrow: string; heading: string; features: Feature[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (isMobile) return
    const newIndex = Math.min(features.length - 1, Math.floor(v * features.length))
    if (newIndex !== activeIndex) {
      setDirection(newIndex > activeIndex ? 1 : -1)
      setActiveIndex(newIndex)
    }
  })

  // Desktop: scroll-pinned showcase
  if (!isMobile) {
    return (
      <section
        ref={containerRef}
        style={{
          height: `${100 + features.length * 18}vh`,
          position: 'relative',
        }}
      >
        <div style={{
          position: 'sticky', top: 72,
          minHeight: 'calc(100vh - 72px)',
          overflow: 'hidden',
          backgroundColor: '#f8fafb',
          backgroundImage: 'radial-gradient(circle, rgba(104,197,173,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          padding: '48px 0 56px',
        }}>
          {/* Gradient mesh */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 70% 10%, rgba(104,197,173,0.06) 0%, transparent 50%), radial-gradient(ellipse at 20% 90%, rgba(242,133,0,0.03) 0%, transparent 50%)',
          }} />

          <div style={{
            maxWidth: 1200, margin: '0 auto', padding: '0 24px',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
            </div>

            {/* Two-column: content left, visual right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
              {/* Left: animated feature content */}
              <div style={{ position: 'relative', minHeight: 320 }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <FeatureContent
                    key={activeIndex}
                    feature={features[activeIndex]}
                    index={activeIndex}
                    direction={direction}
                  />
                </AnimatePresence>
              </div>

              {/* Right: progress + mini cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {features.map((f, i) => {
                  const isActive = i === activeIndex
                  const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
                  const Icon = getIcon(f.icon)
                  return (
                    <motion.div
                      key={f.title}
                      animate={{
                        scale: isActive ? 1 : 0.97,
                        opacity: isActive ? 1 : 0.5,
                      }}
                      transition={{ duration: 0.3 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 20px',
                        borderRadius: 14,
                        background: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                        border: isActive ? `2px solid ${accent}40` : '2px solid transparent',
                        boxShadow: isActive ? '0 8px 32px rgba(0,0,0,0.06)' : 'none',
                        transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
                      }}
                    >
                      {/* Progress bar on left */}
                      <div style={{
                        width: 3, height: 40, borderRadius: 2,
                        background: isActive ? accent : 'rgba(0,0,0,0.08)',
                        transition: 'background 0.3s',
                        flexShrink: 0,
                      }} />

                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${accent}14`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {Icon ? (
                          <Icon size={18} strokeWidth={1.5} color={accent} />
                        ) : (
                          <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                        )}
                      </div>

                      <span style={{
                        color: isActive ? 'var(--dark)' : 'var(--slate)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.92rem',
                        transition: 'color 0.3s, font-weight 0.3s',
                      }}>
                        {f.title}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Bottom scroll progress */}
            <div style={{
              display: 'flex', gap: 8,
              justifyContent: 'center',
              marginTop: 32,
            }}>
              {features.map((_, i) => (
                <div key={i} style={{
                  width: i === activeIndex ? 32 : 8, height: 8,
                  borderRadius: 4,
                  background: i === activeIndex ? '#68c5ad' : 'rgba(0,0,0,0.1)',
                  transition: 'width 0.3s, background 0.3s',
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Mobile: stacked cards with stagger animation
  return (
    <section style={{
      padding: '80px 24px 88px',
      position: 'relative', overflow: 'hidden',
      backgroundColor: '#f8fafb',
      backgroundImage: 'radial-gradient(circle, rgba(104,197,173,0.1) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {features.map((feature, i) => {
            const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
            const Icon = getIcon(feature.icon)
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                style={{
                  background: '#fff', borderRadius: 16, padding: '24px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${accent}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 11,
                    background: `${accent}14`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {Icon ? <Icon size={22} strokeWidth={1.5} color={accent} /> : <span style={{ fontSize: '1.3rem' }}>{feature.icon}</span>}
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>
                      {feature.title}
                    </h3>
                    <p style={{ color: 'var(--slate)', lineHeight: 1.6, fontSize: '0.88rem', margin: 0 }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
