const stats = [
  { num: '14',   label: 'Sites Shipped' },
  { num: '19',   label: 'Active AI Agents' },
  { num: '3x',   label: 'Avg Lead Growth' },
  { num: '24/7', label: 'Always On Systems' },
]

export function StatsBar() {
  return (
    <section aria-label="Agency stats" style={{ background: 'var(--dark-2)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {stats.map(s => (
          <div key={s.num} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
