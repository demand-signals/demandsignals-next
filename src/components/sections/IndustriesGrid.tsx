'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

const industries = [
  { emoji: '🔨', label: 'Contractors & Construction' },
  { emoji: '⚖️', label: 'Legal & Professional Services' },
  { emoji: '🏥', label: 'Medical & Wellness' },
  { emoji: '🍺', label: 'Food & Beverage' },
  { emoji: '🏠', label: 'Real Estate & Property' },
  { emoji: '🛒', label: 'Specialty Retail' },
  { emoji: '🥊', label: 'Fitness & Sports' },
  { emoji: '💆', label: 'Health & Beauty' },
  { emoji: '🎓', label: 'Education & Training' },
  { emoji: '🌿', label: 'Landscape & Outdoor' },
];

export default function IndustriesGrid() {
  return (
    <section
      style={{
        background: '#fff',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Industries We Serve
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2, margin: '14px 0 16px' }}>
              Built for Businesses That Can&apos;t Afford to Be Invisible.
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 580, margin: '0 auto' }}>
              Whether you pour concrete or pour lattes — if your customers are local, our AI systems will find them before your competitors do.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          {industries.map((item) => (
            <StaggerItem
              key={item.label}
              style={{
                background: 'var(--light)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '20px 16px',
                width: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                textAlign: 'center',
                transition: 'border-color var(--t), box-shadow var(--t)',
                cursor: 'default',
              }}
            >
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{item.emoji}</span>
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--dark)',
                  lineHeight: 1.3,
                }}
              >
                {item.label}
              </span>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
