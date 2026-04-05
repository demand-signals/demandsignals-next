'use client'

const mobileScores = [
  { label: 'Performance', value: 97 },
  { label: 'Accessibility', value: 94 },
  { label: 'Best Practices', value: 100 },
  { label: 'SEO', value: 100 },
]

const desktopScores = [
  { label: 'Performance', value: 100 },
  { label: 'Accessibility', value: 94 },
  { label: 'Best Practices', value: 100 },
  { label: 'SEO', value: 100 },
]

const mobileMetrics = [
  { label: 'First Contentful Paint', value: '1.2s', good: true },
  { label: 'Largest Contentful Paint', value: '2.6s', good: false },
  { label: 'Total Blocking Time', value: '60ms', good: true },
  { label: 'Cumulative Layout Shift', value: '0', good: true },
  { label: 'Speed Index', value: '1.3s', good: true },
]

const desktopMetrics = [
  { label: 'First Contentful Paint', value: '0.3s', good: true },
  { label: 'Largest Contentful Paint', value: '0.6s', good: true },
  { label: 'Total Blocking Time', value: '0ms', good: true },
  { label: 'Cumulative Layout Shift', value: '0', good: true },
  { label: 'Speed Index', value: '0.4s', good: true },
]

function scoreColor(value: number) {
  if (value >= 90) return '#0cce6b'
  if (value >= 50) return '#ffa400'
  return '#f33'
}

function ScoreRing({ value, label, size = 90 }: { value: number; label: string; size?: number }) {
  const radius = (size / 2) - 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = scoreColor(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"
          />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size > 80 ? '1.5rem' : '1.1rem', fontWeight: 800, color,
        }}>
          {value}
        </div>
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  )
}

function DeviceCard({ title, icon, scores, metrics }: {
  title: string
  icon: React.ReactNode
  scores: typeof mobileScores
  metrics: typeof mobileMetrics
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '32px 28px',
      flex: 1,
      minWidth: 320,
    }}>
      {/* Device header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        {icon}
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{title}</span>
      </div>

      {/* Score rings row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
        {scores.map(s => (
          <ScoreRing key={s.label} value={s.value} label={s.label} size={80} />
        ))}
      </div>

      {/* Metrics */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Core Web Vitals
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
          {metrics.map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.good ? '#0cce6b' : '#ffa400', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{m.label}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: m.good ? '#0cce6b' : '#ffa400' }}>{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
  </svg>
)

const DesktopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

export default function LighthouseScores() {
  return (
    <section style={{ background: 'var(--dark)', padding: '80px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
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
            marginBottom: 14,
          }}>
            Google Lighthouse Audit
          </span>
          <h2 style={{
            color: '#fff',
            fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            Green Scores Rank Higher. We Build Green.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: 680, margin: '0 auto' }}>
            Google uses Chrome Lighthouse audits as a direct ranking signal. Sites that score green across Performance, Accessibility, Best Practices, and SEO get preferential treatment in search results. Most agencies deliver sites scoring 40-60. We ship 90+.
          </p>
        </div>

        {/* Two device cards */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 40 }}>
          <DeviceCard title="Mobile" icon={<PhoneIcon />} scores={mobileScores} metrics={mobileMetrics} />
          <DeviceCard title="Desktop" icon={<DesktopIcon />} scores={desktopScores} metrics={desktopMetrics} />
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.08)',
          flexWrap: 'wrap', gap: 20,
        }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { color: '#f33', range: '0-49', label: 'Poor' },
              { color: '#ffa400', range: '50-89', label: 'Needs Work' },
              { color: '#0cce6b', range: '90-100', label: 'Good' },
            ].map(item => (
              <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                  {item.range} — {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(12, 206, 107, 0.08)',
            border: '1px solid rgba(12, 206, 107, 0.2)',
            borderRadius: 8, padding: '8px 14px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0cce6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span style={{ color: '#0cce6b', fontSize: '0.78rem', fontWeight: 600 }}>
              Live audit of dsig.demandsignals.dev — April 2026
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
