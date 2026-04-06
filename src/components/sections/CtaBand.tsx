import Link from 'next/link';
import { BOOKING_URL } from '@/lib/constants';

export default function CtaBand() {
  return (
    <section
      style={{
        background: '#FF6B2B',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        padding: '96px 24px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <h2
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
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
              background: 'var(--dark)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '15px 32px',
              borderRadius: 100,
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
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '15px 32px',
              borderRadius: 100,
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.5)',
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
