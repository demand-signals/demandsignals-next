import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'

const cards = [
  {
    title: 'The person doing social media',
    subtitle: 'Social media manager ($3,000+/mo)',
    description:
      'AI-generated posts across all platforms, 5-7/week, tailored brand voice. Better consistency. More volume. Fraction of the cost.',
  },
  {
    title: 'The agency managing your website',
    subtitle: 'SEO agency ($1,000-3,000/mo)',
    description:
      'AI monitors every page against real search data daily. Pages that underperform get rewritten. No consultant needed.',
  },
  {
    title: 'The person responding to reviews',
    subtitle: 'Reputation management ($300-500/mo)',
    description:
      'AI drafts thoughtful responses within hours, not days. Every review handled. Never misses one.',
  },
  {
    title: 'The marketing coordinator',
    subtitle: '$3,500+/mo salary',
    description:
      'AI plans your content calendar, generates posts, schedules them, and reports on performance. No PTO. No turnover.',
  },
]

const agentTypes = [
  { icon: '✍️', label: 'Content Agents', count: '40+' },
  { icon: '📊', label: 'SEO & Analytics', count: '25+' },
  { icon: '📣', label: 'Social & Outreach', count: '30+' },
  { icon: '⭐', label: 'Review & Reputation', count: '15+' },
  { icon: '🔍', label: 'Research & Intel', count: '20+' },
  { icon: '⚙️', label: 'Ops & Automation', count: '35+' },
]

export default function ReplacesGrid() {
  return (
    <section
      style={{
        background: 'var(--dark)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header with FUD hook */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', background: 'rgba(255,107,43,0.15)', color: '#FF6B2B', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            The Window Is Closing
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '14px 0 20px' }}>
            Your Team Just Got a Lot Bigger.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 680, margin: '0 auto 16px' }}>
            Right now, <span style={{ color: '#FF6B2B', fontWeight: 700 }}>95% of corporate AI projects are failing</span>. Fortune 500 companies are firing thousands of humans only to burn millions on AI replacements that never ship. Their committees are still debating frameworks while their budgets evaporate.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
            That&apos;s your window. While the giants stumble, you can deploy AI agents that actually work — this month, not next year. But they won&apos;t fail forever. Move now.
          </p>
        </div>

        {/* Replaces cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
            marginBottom: 64,
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: 'var(--dark-2)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--orange)',
                }}
              >
                Replaces
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: 0 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600, margin: 0 }}>
                {card.subtitle}
              </p>
              <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Agent warehouse section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(104,197,173,0.08) 0%, rgba(255,107,43,0.06) 100%)',
          border: '1px solid rgba(104,197,173,0.15)',
          borderRadius: 20,
          padding: '48px 40px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            {/* Left — copy */}
            <div>
              <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.15)', color: '#68c5ad', padding: '5px 14px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                Agent Warehouse
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
                Hundreds of Agent Types. Ready to Deploy.
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 16 }}>
                We don&apos;t build agents from scratch for every client. We maintain a warehouse of battle-tested agent types — content writers, SEO monitors, review responders, outreach runners, data analysts, and dozens more. Each one has been deployed, tuned, and proven across real businesses.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 24 }}>
                <strong style={{ color: '#fff' }}>Our process:</strong> Audit your operations → select the right agents → configure for your brand, market, and systems → deploy → monitor and optimize. Most clients are fully operational within 2-4 weeks.
              </p>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#FF6B2B',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '12px 24px',
                  borderRadius: 100,
                  textDecoration: 'none',
                }}
              >
                See Which Agents Fit Your Business →
              </a>
            </div>

            {/* Right — agent type grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {agentTypes.map(a => (
                <div key={a.label} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '18px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{a.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--teal)', fontWeight: 600 }}>{a.count} agents</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .agent-warehouse-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
