type InfographicData = {
  headline: string
  stats?: Array<{ label: string; value: string }>
  type: 'stats' | 'timeline' | 'comparison' | 'checklist'
}

const BRAND_TEAL = '#68c5ad'
const BRAND_DARK = '#1d2330'
const BRAND_ORANGE = '#FF6B2B'

export function BlogInfographic({ data, title }: { data: InfographicData; title: string }) {
  if (data.type === 'stats' && data.stats) {
    return <StatsInfographic headline={data.headline} stats={data.stats} title={title} />
  }
  // Default: headline-only card
  return <HeadlineInfographic headline={data.headline} title={title} />
}

function HeadlineInfographic({ headline, title }: { headline: string; title: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${BRAND_DARK} 0%, #2a3448 100%)`,
      borderRadius: 16, padding: '40px 32px', marginBottom: 32,
      border: `1px solid rgba(104,197,173,0.2)`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <img src="/dsig-icon.png" alt="" width={24} height={24} style={{ borderRadius: 4 }} />
          <span style={{ color: BRAND_TEAL, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Demand Signals
          </span>
        </div>
        <div style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
          {headline}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          {title}
        </div>
      </div>
    </div>
  )
}

function StatsInfographic({ headline, stats, title }: { headline: string; stats: Array<{ label: string; value: string }>; title: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${BRAND_DARK} 0%, #2a3448 100%)`,
      borderRadius: 16, padding: '36px 32px', marginBottom: 32,
      border: `1px solid rgba(104,197,173,0.2)`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />
      <div style={{ position: 'relative' }}>
        {/* Brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/dsig-icon.png" alt="" width={24} height={24} style={{ borderRadius: 4 }} />
            <span style={{ color: BRAND_TEAL, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Demand Signals
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>demandsignals.co</span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 24 }}>
          {headline}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 16 }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '16px 14px', textAlign: 'center',
            }}>
              <div style={{
                fontSize: '1.6rem', fontWeight: 800, lineHeight: 1,
                color: i % 2 === 0 ? BRAND_TEAL : BRAND_ORANGE,
                marginBottom: 6,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
          {title}
        </div>
      </div>
    </div>
  )
}
