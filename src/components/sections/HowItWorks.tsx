'use client'

import { BOOKING_URL } from '@/lib/constants'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

const advantages = [
  {
    icon: '⚡',
    title: 'We Ship Faster',
    stat: '2-4 weeks',
    description: 'What traditional agencies quote at 3-6 months, we deliver in weeks. Our AI agents handle the repetitive work while our human team focuses on strategy and quality.',
  },
  {
    icon: '🎯',
    title: 'We Build Smarter',
    stat: 'AI-native',
    description: 'Every site, app, and system we build has AI wired into the architecture from day one — not bolted on as an afterthought. Your digital presence gets smarter the longer it runs.',
  },
  {
    icon: '💰',
    title: 'We Cost Less',
    stat: '60-85% less',
    description: 'No bloated teams. No monthly retainers that fund account managers who send you reports. You pay for results delivered by AI systems, supervised by senior strategists.',
  },
  {
    icon: '📈',
    title: 'We Never Stop',
    stat: '24/7/365',
    description: 'Your marketing doesn\'t pause for weekends, holidays, or sick days. AI agents monitor rankings, publish content, respond to reviews, and generate leads around the clock.',
  },
]

export default function HowItWorks() {
  return (
    <section
      style={{
        background: 'var(--light)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)',
              padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Why Demand Signals
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2, margin: '14px 0 16px' }}>
              This Is All We Do. All Day. Every Day.
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: 640, margin: '0 auto' }}>
              We don&apos;t dabble in AI systems — we live them day and night. Our human + AI teams build sites, apps, and demand generation systems faster, better, and cheaper than any traditional agency. And we never stop optimizing.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}
        >
          {advantages.map((item) => (
            <StaggerItem
              key={item.title}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--teal)' }}>{item.stat}</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)', margin: 0, lineHeight: 1.3 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--slate)', lineHeight: 1.65, margin: 0 }}>
                {item.description}
              </p>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScrollReveal direction="up" delay={0.2}>
          <div style={{ textAlign: 'center' }}>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', background: '#FF6B2B', color: '#fff',
                fontWeight: 700, fontSize: '0.95rem', padding: '14px 32px',
                borderRadius: 100, textDecoration: 'none',
              }}
            >
              See What We Can Build for You →
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
