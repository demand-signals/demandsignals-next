import Link from 'next/link';
import { BOOKING_URL } from '@/lib/constants';

const checklist = [
  { icon: '📊', label: 'Current Rankings & Visibility' },
  { icon: '🔍', label: 'Competitive Gap Analysis' },
  { icon: '🔮', label: 'AI Search Audit' },
  { icon: '🗺️', label: 'Local Demand Map' },
  { icon: '📋', label: 'Custom Action Plan' },
];

export default function BookingSection() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, var(--dark) 0%, var(--dark-2) 100%)',
        padding: '96px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 56,
          alignItems: 'center',
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Not Sure Where to Start? Let's Map It Out.
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            30 minutes. No pitch. Just an honest look at where your demand is coming from, where
            it's being lost, and what AI can realistically do for your business.
          </p>
          <p
            style={{
              fontSize: '0.92rem',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            We'll look at your Google rankings, AI visibility, GMB performance, and competitor gaps
            — live on the call.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'var(--teal)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '14px 28px',
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'background var(--t)',
                whiteSpace: 'nowrap',
              }}
            >
              Schedule My Free Call →
            </a>
            <Link
              href="/tools/research-reports"
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 600,
                fontSize: '0.95rem',
                padding: '14px 28px',
                borderRadius: 8,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'border-color var(--t), color var(--t)',
                whiteSpace: 'nowrap',
              }}
            >
              Get a Free Report First
            </Link>
          </div>
        </div>

        {/* Right column — checklist card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '36px 32px',
          }}
        >
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 24px',
              letterSpacing: '0.01em',
            }}
          >
            What We Cover in 30 Minutes
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {checklist.map((item) => (
              <li
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontSize: '0.95rem',
                  color: 'rgba(255,255,255,0.82)',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--teal-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
