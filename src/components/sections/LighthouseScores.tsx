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

const perfLabels = ['FCP', 'SI', 'LCP', 'TBT', 'CLS']

function scoreColor(value: number) {
  if (value >= 90) return '#0cce6b'
  if (value >= 50) return '#ffa400'
  return '#f33'
}

function ScoreRing({ value, label, size = 80 }: { value: number; label: string; size?: number }) {
  const radius = (size / 2) - 5
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = scoreColor(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size > 100 ? '2.2rem' : '1.2rem', fontWeight: 800, color,
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

/* Large summary ring with metric labels around it */
function SummaryRing({ value }: { value: number }) {
  const size = 160
  const radius = 68
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = scoreColor(value)

  return (
    <div style={{ position: 'relative', width: size + 60, height: size + 40 }}>
      {/* Metric labels around the ring */}
      <span style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>FCP</span>
      <span style={{ position: 'absolute', top: -2, left: 20, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>SI</span>
      <span style={{ position: 'absolute', top: 55, right: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>LCP</span>
      <span style={{ position: 'absolute', top: 55, left: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>CLS</span>
      <span style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>TBT</span>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '12px auto 0' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: size, height: size, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Performance</span>
      </div>
    </div>
  )
}

function DeviceCard({ title, icon, scores, metrics, perfScore }: {
  title: string; icon: React.ReactNode
  scores: typeof mobileScores; metrics: typeof mobileMetrics; perfScore: number
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '32px 28px',
      flex: 1, minWidth: 320, border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Device header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        {icon}
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{title}</span>
      </div>

      {/* Top: score rings row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, padding: '0 4px' }}>
        {scores.map(s => (
          <ScoreRing key={s.label} value={s.value} label={s.label} size={72} />
        ))}
      </div>

      {/* Summary ring + metrics side by side */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28,
        alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24,
      }}>
        <SummaryRing value={perfScore} />

        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Core Web Vitals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metrics.map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.good ? '#0cce6b' : '#ffa400', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: m.good ? '#0cce6b' : '#ffa400' }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { color: '#f33', label: '0-49' },
          { color: '#ffa400', label: '50-89' },
          { color: '#0cce6b', label: '90-100' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
  </svg>
)

const DesktopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            display: 'inline-block', background: 'rgba(12, 206, 107, 0.12)', color: '#0cce6b',
            padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            Google Lighthouse Audit
          </span>
          <h2 style={{
            color: '#fff', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
            fontWeight: 800, lineHeight: 1.2, marginBottom: 16,
          }}>
            Green Scores Rank Higher. We Build Green.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: 680, margin: '0 auto' }}>
            Google uses Chrome Lighthouse audits as a direct ranking signal. Sites that score green across Performance, Accessibility, Best Practices, and SEO get preferential treatment in search results. Most agencies deliver sites scoring 40-60. We ship 90+.
          </p>
        </div>

        {/* Two device cards */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
          <DeviceCard title="Mobile" icon={<PhoneIcon />} scores={mobileScores} metrics={mobileMetrics} perfScore={97} />
          <DeviceCard title="Desktop" icon={<DesktopIcon />} scores={desktopScores} metrics={desktopMetrics} perfScore={100} />
        </div>

        {/* Live audit badge */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(12, 206, 107, 0.08)', border: '1px solid rgba(12, 206, 107, 0.2)',
            borderRadius: 8, padding: '8px 16px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0cce6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span style={{ color: '#0cce6b', fontSize: '0.8rem', fontWeight: 600 }}>
              Live audit of dsig.demandsignals.dev — April 2026
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
