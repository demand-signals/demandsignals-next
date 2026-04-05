const steps = [
  {
    number: '01',
    title: 'Demand Gap Audit',
    description:
      'Cyrus, our AI research agent, maps your competitive landscape, keyword universe, and AI citation opportunities before we write a single word. Includes a full SEO + GEO + AEO analysis.',
  },
  {
    number: '02',
    title: 'Architecture & Build',
    description:
      'We build your site on Next.js — not WordPress, not a template. Database-driven, schema-marked, wired to your CRM, Google, and every AI platform from day one.',
  },
  {
    number: '03',
    title: 'AI Systems Go Live',
    description:
      'Jasper generates content daily. Gabby monitors AI citations. Morgan handles reviews. Cyrus watches rankings. All running 24/7, all reporting to your portal.',
  },
  {
    number: '04',
    title: 'You Approve. AI Executes.',
    description:
      'You spend 10 minutes a week in your portal approving posts, review responses, and content updates. The AI handles everything else. Demand grows while you run your business.',
  },
];

export default function HowItWorks() {
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
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800,
            color: 'var(--dark)',
            textAlign: 'center',
            marginBottom: 64,
            lineHeight: 1.2,
          }}
        >
          We Build Your Projects Different, From Day One.
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 32,
          }}
        >
          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--teal-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: 'var(--teal-dark)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {step.number}
                </span>
              </div>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--slate)',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
