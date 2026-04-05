const cards = [
  {
    title: 'The person doing social media',
    subtitle: 'Social media manager ($3,000+/mo)',
    description:
      'AI-generated posts across all platforms, 5–7/week, tailored brand voice. Better consistency. More volume. Fraction of the cost.',
  },
  {
    title: 'The agency managing your website',
    subtitle: 'SEO agency ($1,000–3,000/mo)',
    description:
      'AI monitors every page against real search data daily. Pages that underperform get rewritten. No consultant needed.',
  },
  {
    title: 'The person responding to reviews',
    subtitle: 'Reputation management ($300–500/mo)',
    description:
      'AI drafts thoughtful responses within hours, not days. Every review handled. Never misses one.',
  },
  {
    title: 'The marketing coordinator',
    subtitle: '$3,500+/mo salary',
    description:
      'AI plans your content calendar, generates posts, schedules them, and reports on performance. No PTO. No turnover.',
  },
];

export default function ReplacesGrid() {
  return (
    <section
      style={{
        background: 'var(--dark)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.15)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            AI-Powered Workforce
          </span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '14px 0 16px' }}>
            Your Team Just Got a Lot Bigger.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 580, margin: '0 auto' }}>
            Every role below is handled by AI — running 24/7, never calling in sick, and costing a fraction of what you&apos;re paying now.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
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
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--teal)',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {card.subtitle}
              </p>
              <p
                style={{
                  fontSize: '0.92rem',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
