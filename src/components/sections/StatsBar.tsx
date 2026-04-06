'use client'
import { useEffect, useRef, useState } from 'react'

const stats = [
  { end: 10, suffix: '×', label: 'Avg Lead Volume Increase' },
  { end: 68, suffix: '%', label: 'Lower Cost Per Lead' },
  { end: 3, suffix: ' mo.', label: 'Avg Time to First Page Rank' },
  { end: 24, suffix: '/7', label: 'Always-On — No Sick Days' },
]

function CountUp({ end, suffix, duration = 1800 }: { end: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true) },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const steps = 40
    const increment = end / steps
    const stepTime = duration / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, stepTime)
    return () => clearInterval(timer)
  }, [started, end, duration])

  return (
    <div ref={ref} style={{ fontSize: 'clamp(2.2rem,3.5vw,3rem)', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>
      {count}{suffix}
    </div>
  )
}

export function StatsBar() {
  return (
    <section aria-label="Agency stats" style={{ background: 'var(--dark-2)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <CountUp end={s.end} suffix={s.suffix} />
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
