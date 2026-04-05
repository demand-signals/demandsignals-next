import Link from 'next/link';
import { BOOKING_URL } from '@/lib/constants';

const checklist = [
  { icon: '📊', label: 'Current Rankings & Visibility' },
  { icon: '🔍', label: 'Competitive Gap Analysis' },
  { icon: '🔮', label: 'AI Search Audit' },
  { icon: '🗺️', label: 'Local Demand Map' },
  { icon: '📋', label: 'Custom Action Plan' },
];

const reports = [
  {
    icon: '🔍',
    title: 'Competitor Intelligence',
    value: '$800 value',
    description: "See exactly what your top competitors are doing — and where they're exposed.",
  },
  {
    icon: '📈',
    title: 'Market Demand Analysis',
    value: '$650 value',
    description: 'Map the full demand landscape for your market before you build anything.',
  },
  {
    icon: '🔮',
    title: 'SEO + GEO + AEO Audit',
    value: '$1,200 value',
    description: 'Your visibility score across Google, Maps, ChatGPT, Perplexity & Gemini.',
  },
  {
    icon: '📋',
    title: 'Strategic Project Plan',
    value: '$600 value',
    description: 'A 90-day roadmap with KPIs, tasks, and budget estimates. Built for your business.',
  },
];

export default function BookingSection() {
  return (
    <section
      style={{
        background: 'var(--light)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--dark)',
              lineHeight: 1.2,
              margin: '0 0 16px',
            }}
          >
            Not Sure Where to Start?
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--slate)',
              lineHeight: 1.65,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            30 minutes. No pitch. Just an honest look at where your demand is coming from, where
            it&apos;s being lost, and what AI can realistically do for your business.
          </p>
        </div>

        {/* Two-column: Call details + Checklist */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 32,
            marginBottom: 64,
          }}
        >
          {/* Left — call details */}
          <div
            style={{
              background: 'var(--dark)',
              borderRadius: 20,
              padding: '40px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              Book a Free Strategy Call
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>
              We&apos;ll look at your Google rankings, AI visibility, GMB performance, and competitor gaps — live on the call.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {checklist.map((item) => (
                <li
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    fontSize: '0.93rem',
                    color: 'rgba(255,255,255,0.82)',
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: 'var(--teal-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#FF6B2B',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '14px 28px',
                borderRadius: 100,
                textDecoration: 'none',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              Schedule My Free Call →
            </a>
          </div>

          {/* Right — report cards grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: 'var(--dark)', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              Or Get a Free Intelligence Report
            </h3>
            <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.6, margin: 0 }}>
              Delivered within 48 hours. No strings attached. No call required.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
              {reports.map((report) => (
                <div
                  key={report.title}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '20px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{report.icon}</span>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--dark)', margin: 0 }}>
                    {report.title}
                  </h4>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {report.value}
                  </span>
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.5, margin: 0 }}>
                    {report.description}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/tools/research-reports"
              style={{
                display: 'inline-block',
                background: '#FF6B2B',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '14px 28px',
                borderRadius: 100,
                textDecoration: 'none',
                textAlign: 'center',
                width: 'fit-content',
              }}
            >
              Get My Free Report →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
