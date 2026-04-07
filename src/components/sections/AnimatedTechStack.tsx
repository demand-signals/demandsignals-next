'use client'

import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { ShapeBg } from '@/components/ui/ShapeBg'
import { pillStyle } from '@/components/ui/SectionHeading'

type TechRow = { label: string; value: string }

export function AnimatedTechStack({
  eyebrow, heading, description, techStack,
}: {
  eyebrow?: string; heading?: string; description?: string; techStack: TechRow[]
}) {
  return (
    <section style={{ padding: '80px 24px', position: 'relative', background: '#fff' }}>
      <style>{`@media(min-width:768px){.tech-stack-grid{grid-template-columns:1fr 1fr !important;gap:64px !important}}`}</style>
      <ShapeBg />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40, alignItems: 'center' }} className="tech-stack-grid">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span style={pillStyle}>{eyebrow || 'Our Stack'}</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 20px' }}>
              {heading || 'Built on Technology, Powered by AI'}
            </h2>
            {description && (
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>{description}</p>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <GlassCard style={{ background: 'rgba(244,246,249,0.9)' }}>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
              {techStack.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(104,197,173,0.08)' }}
                >
                  <strong style={{ color: 'var(--slate)', minWidth: 110, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                  <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                </motion.div>
              ))}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
