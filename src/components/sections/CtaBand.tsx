import Link from 'next/link';
import { BOOKING_URL } from '@/lib/constants';

export default function CtaBand() {
  return (
    <section
      style={{
        background: 'var(--dark)',
        padding: '96px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Ready To Be The Signal?
        </h2>
        <p
          style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 520,
          }}
        >
          Most of your competitors are still running the old playbook. The window is open right now.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            marginTop: 12,
          }}
        >
          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              background: 'var(--teal)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '15px 32px',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'background var(--t)',
              whiteSpace: 'nowrap',
            }}
          >
            Start the Conversation →
          </Link>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'transparent',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '15px 32px',
              borderRadius: 8,
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.25)',
              transition: 'border-color var(--t)',
              whiteSpace: 'nowrap',
            }}
          >
            Book a Free 30-Min Call
          </a>
        </div>
      </div>
    </section>
  );
}
