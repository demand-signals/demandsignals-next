const industries = [
  { emoji: '🔨', label: 'Contractors & Construction' },
  { emoji: '⚖️', label: 'Legal & Professional Services' },
  { emoji: '🏥', label: 'Medical & Wellness' },
  { emoji: '🍺', label: 'Food & Beverage' },
  { emoji: '🏠', label: 'Real Estate & Property' },
  { emoji: '🛒', label: 'Specialty Retail' },
  { emoji: '🥊', label: 'Fitness & Sports' },
  { emoji: '🚗', label: 'Auto & Marine Services' },
  { emoji: '💆', label: 'Health & Beauty' },
  { emoji: '🎓', label: 'Education & Training' },
  { emoji: '🌿', label: 'Landscape & Outdoor' },
  { emoji: '⚡', label: 'Home Services' },
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
          If You Sell Locally, We Generate Your Demand.
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {industries.map((item) => (
            <div
              key={item.label}
              style={{
                background: 'var(--light)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '20px 16px',
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
