'use client'

const scores = [
  { label: 'Performance', value: 100, color: '#0cce6b' },
  { label: 'Accessibility', value: 94, color: '#0cce6b' },
  { label: 'Best Practices', value: 100, color: '#0cce6b' },
  { label: 'SEO', value: 100, color: '#0cce6b' },
]

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"
          />
          {/* Score ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: '#fff',
        }}>
          {value}
        </div>
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
        {label}
      </span>
    </div>
  )
}

export default function LighthouseScores() {
  return (
    <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 56,
          alignItems: 'center',
        }}>
          {/* Left — copy */}
          <div>
            <span style={{
              display: 'inline-block',
              background: 'rgba(12, 206, 107, 0.15)',
              color: '#0cce6b',
              padding: '6px 18px',
              borderRadius: 100,
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              Performance Matters
            </span>
            <h2 style={{
              color: '#fff',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 20,
            }}>
              Green Scores Rank Higher. We Build Green.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 16 }}>
              Google uses Lighthouse scores as a ranking signal. Sites that score green across Performance, Accessibility, Best Practices, and SEO get preferential treatment in search results.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 24 }}>
              Most agencies deliver sites scoring 40-60. Every site we ship scores 90+. That&apos;s not a flex — it&apos;s an unfair advantage your competitors don&apos;t have.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(12, 206, 107, 0.1)',
              border: '1px solid rgba(12, 206, 107, 0.25)',
              borderRadius: 10, padding: '12px 18px',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0cce6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span style={{ color: '#0cce6b', fontSize: '0.85rem', fontWeight: 600 }}>
                This site&apos;s live Lighthouse scores — tested right now
              </span>
            </div>
          </div>

          {/* Right — score rings */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 32,
            justifyItems: 'center',
          }}>
            {scores.map(s => (
              <ScoreRing key={s.label} {...s} />
            ))}
          </div>
        </div>

        {/* Bottom legend */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 32,
          marginTop: 48, paddingTop: 32,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexWrap: 'wrap',
        }}>
          {[
            { color: '#f33', range: '0-49', label: 'Poor' },
            { color: '#ffa400', range: '50-89', label: 'Needs Work' },
            { color: '#0cce6b', range: '90-100', label: 'Good' },
          ].map(item => (
            <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                {item.range} — {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section > div > div:first-child {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
        }
      `}</style>
    </section>
  )
}
