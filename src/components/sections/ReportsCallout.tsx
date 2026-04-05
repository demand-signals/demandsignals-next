import Link from 'next/link';

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

export default function ReportsCallout() {
  return (
    <section
      style={{
        background: 'var(--light)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            fontWeight: 800,
            color: 'var(--dark)',
            textAlign: 'center',
            marginBottom: 56,
            lineHeight: 1.2,
          }}
        >
          Not Sure Where to Start? Let the Data Decide.
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 20,
            marginBottom: 44,
          }}
        >
          {reports.map((report) => (
            <div
              key={report.title}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '28px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{report.icon}</span>
              <div>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--dark)',
                    margin: '0 0 4px',
                  }}
                >
                  {report.title}
                </h3>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--teal-dark)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {report.value}
                </span>
              </div>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--slate)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {report.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Link
            href="/tools/research-reports"
            style={{
              display: 'inline-block',
              background: 'var(--teal)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '14px 32px',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'background var(--t)',
            }}
          >
            Get My Free Report →
          </Link>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--slate)',
              margin: 0,
            }}
          >
            Delivered within 48 hours. No strings attached.
          </p>
        </div>
      </div>
    </section>
  );
}
