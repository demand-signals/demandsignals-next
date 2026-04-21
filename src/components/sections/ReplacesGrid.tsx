'use client'

import { ScrollReveal } from '@/components/motion/ScrollReveal'

export default function ReplacesGrid() {
  return (
    <section
      style={{
        background: 'var(--dark)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header with FUD hook */}
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,107,43,0.15)', color: '#FF6B2B', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              The Window Is Closing
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '14px 0 20px' }}>
              More Results in Less Time with Smaller Budgets.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 900, margin: '0 auto 16px' }}>
              Right now, <span style={{ color: '#FF6B2B', fontWeight: 700 }}>95% of corporate AI projects are failing</span>. Fortune 500 companies are firing thousands of humans only to burn millions on AI replacements that never ship. Their committees are still debating frameworks while their budgets evaporate.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 900, margin: '0 auto' }}>
              This is your window, the opportunity is now. While the giants stumble, you can deploy AI agents that actually work — this month, not next year. But they won&apos;t fail forever. Move now. The Human and AI Teams at Demand Signals are the pilots that keep your operations flying higher and faster than ever before — generating more results with less investment.
            </p>
          </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
