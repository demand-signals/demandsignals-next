'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'

// Particle canvas — ported exactly from demandsignals.co base44 source
export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: -999, y: -999 })

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMouse)

    const COLORS = ['#52C9A0', '#FF6B2B', '#4A7FE5', '#FFAA1E', '#c084fc']

    // 100 small particles
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      baseVx: (Math.random() - 0.5) * 0.5,
      baseVy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2.5 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    // 5 floating gradient orbs
    const orbs = [
      { px: 0.2, py: 0.3, vx: 0.0003, vy: 0.0002, color: '#52C9A0', size: 0.35 },
      { px: 0.8, py: 0.7, vx: -0.0002, vy: 0.0003, color: '#FF6B2B', size: 0.3 },
      { px: 0.5, py: 0.5, vx: 0.0002, vy: -0.0003, color: '#4A7FE5', size: 0.28 },
      { px: 0.1, py: 0.8, vx: 0.0003, vy: -0.0002, color: '#FFAA1E', size: 0.25 },
      { px: 0.9, py: 0.2, vx: -0.0003, vy: 0.0002, color: '#c084fc', size: 0.27 },
    ]

    // 18 floating shapes
    const shapes = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI * 2,
      rot: (Math.random() - 0.5) * 0.02,
      size: Math.random() * 14 + 8,
      type: (['triangle', 'square', 'diamond', 'ring'] as const)[i % 4],
      color: COLORS[i % COLORS.length],
    }))

    // 40 falling sparks
    const sparks = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      w: Math.random() * 3 + 1,
      h: Math.random() * 10 + 4,
      vy: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? '#FF6B2B' : '#FFAA1E',
      alpha: Math.random() * 0.5 + 0.2,
    }))

    // Featured bouncing shape
    const FEAT_COLORS = ['#52C9A0', '#FF6B2B', '#FFAA1E', '#c084fc', '#4A7FE5', '#ff4daa', '#00e5ff']
    const FEAT_TYPES = ['star', 'triangle', 'diamond', 'hexagon', 'cross'] as const
    const featured = {
      x: canvas.width * 0.5,
      y: canvas.height * 0.3,
      vx: 1.2,
      vy: 0.8,
      angle: 0,
      size: 22,
      color: FEAT_COLORS[Math.floor(Math.random() * FEAT_COLORS.length)],
      type: FEAT_TYPES[Math.floor(Math.random() * FEAT_TYPES.length)],
    }

    // Draw small floating shape
    function drawShape(c: CanvasRenderingContext2D, s: typeof shapes[0]) {
      c.save()
      c.translate(s.x, s.y)
      c.rotate(s.angle)
      c.strokeStyle = s.color
      c.lineWidth = 1.5
      c.globalAlpha = 0.55
      const sz = s.size
      c.beginPath()
      if (s.type === 'triangle') {
        c.moveTo(0, -sz); c.lineTo(sz * 0.866, sz * 0.5); c.lineTo(-sz * 0.866, sz * 0.5); c.closePath()
      } else if (s.type === 'square') {
        c.rect(-sz / 2, -sz / 2, sz, sz)
      } else if (s.type === 'diamond') {
        c.moveTo(0, -sz); c.lineTo(sz * 0.6, 0); c.lineTo(0, sz); c.lineTo(-sz * 0.6, 0); c.closePath()
      } else {
        c.arc(0, 0, sz * 0.6, 0, Math.PI * 2)
        c.stroke()
        c.beginPath()
        c.arc(0, 0, sz * 0.35, 0, Math.PI * 2)
      }
      c.stroke()
      c.restore()
    }

    // Draw featured glowing shape
    function drawFeatured(c: CanvasRenderingContext2D, f: typeof featured) {
      c.save()
      c.translate(f.x, f.y)
      c.rotate(f.angle)
      const grad = c.createRadialGradient(0, 0, 0, 0, 0, f.size * 2.8)
      grad.addColorStop(0, f.color + '55')
      grad.addColorStop(1, 'transparent')
      c.fillStyle = grad
      c.beginPath()
      c.arc(0, 0, f.size * 2.8, 0, Math.PI * 2)
      c.fill()
      c.globalAlpha = 1
      c.strokeStyle = f.color
      c.lineWidth = 2.5
      c.shadowColor = f.color
      c.shadowBlur = 18
      const sz = f.size
      c.beginPath()
      if (f.type === 'star') {
        c.moveTo(0, -sz); c.lineTo(sz * 0.25, -sz * 0.25); c.lineTo(sz, 0)
        c.lineTo(sz * 0.25, sz * 0.25); c.lineTo(0, sz); c.lineTo(-sz * 0.25, sz * 0.25)
        c.lineTo(-sz, 0); c.lineTo(-sz * 0.25, -sz * 0.25); c.closePath()
      } else if (f.type === 'triangle') {
        c.moveTo(0, -sz); c.lineTo(sz * 0.866, sz * 0.5); c.lineTo(-sz * 0.866, sz * 0.5); c.closePath()
      } else if (f.type === 'diamond') {
        c.moveTo(0, -sz); c.lineTo(sz * 0.6, 0); c.lineTo(0, sz); c.lineTo(-sz * 0.6, 0); c.closePath()
      } else if (f.type === 'hexagon') {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 3 * i - Math.PI / 6
          i === 0 ? c.moveTo(Math.cos(a) * sz, Math.sin(a) * sz) : c.lineTo(Math.cos(a) * sz, Math.sin(a) * sz)
        }
        c.closePath()
      } else { // cross
        const t = sz * 0.35
        c.moveTo(-t, -sz); c.lineTo(t, -sz); c.lineTo(t, -t); c.lineTo(sz, -t)
        c.lineTo(sz, t); c.lineTo(t, t); c.lineTo(t, sz); c.lineTo(-t, sz)
        c.lineTo(-t, t); c.lineTo(-sz, t); c.lineTo(-sz, -t); c.lineTo(-t, -t); c.closePath()
      }
      c.stroke()
      c.shadowBlur = 0
      c.fillStyle = f.color
      c.globalAlpha = 0.95
      c.beginPath()
      c.arc(0, 0, 3.5, 0, Math.PI * 2)
      c.fill()
      c.restore()
    }

    function draw() {
      const W = canvas.width, H = canvas.height
      const rect = canvas.getBoundingClientRect()
      const mx = mouseRef.current.x - rect.left
      const my = mouseRef.current.y - rect.top
      ctx.clearRect(0, 0, W, H)

      // Draw orbs
      orbs.forEach(o => {
        o.px += o.vx; o.py += o.vy
        if (o.px < 0) { o.px = 0; o.vx *= -0.5 }
        if (o.px > 1) { o.px = 1; o.vx *= -0.5 }
        if (o.py < 0) { o.py = 0; o.vy *= -0.5 }
        if (o.py > 1) { o.py = 1; o.vy *= -0.5 }
        const g = ctx.createRadialGradient(o.px * W, o.py * H, 0, o.px * W, o.py * H, o.size * W)
        g.addColorStop(0, o.color + '38')
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(o.px * W, o.py * H, o.size * W, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw particle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.globalAlpha = (1 - dist / 110) * 0.25
            ctx.strokeStyle = particles[i].color
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1

      // Draw & update particles with mouse repulsion
      particles.forEach(p => {
        const dx = p.x - mx, dy = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 130 && dist > 0) {
          const force = (1 - dist / 130) * 6
          p.vx += dx / dist * force
          p.vy += dy / dist * force
        }
        p.vx += (p.baseVx - p.vx) * 0.02
        p.vy += (p.baseVy - p.vy) * 0.02
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 8) { p.vx = p.vx / spd * 8; p.vy = p.vy / spd * 8 }
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) { p.vx *= -1; p.x = Math.max(0, Math.min(W, p.x)) }
        if (p.y < 0 || p.y > H) { p.vy *= -1; p.y = Math.max(0, Math.min(H, p.y)) }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.75
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // Draw floating shapes with mouse-speed boost
      shapes.forEach(s => {
        const dx = s.x - mx, dy = s.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const speedMult = dist < 200 ? 1 + (1 - dist / 200) * 4 : 1
        s.x += s.vx; s.y += s.vy
        s.angle += s.rot * speedMult
        if (s.x < -50 || s.x > W + 50) s.vx *= -1
        if (s.y < -50 || s.y > H + 50) s.vy *= -1
        drawShape(ctx, s)
      })

      // Featured shape
      const fdx = featured.x - mx, fdy = featured.y - my
      const fdist = Math.sqrt(fdx * fdx + fdy * fdy)
      if (fdist < 220 && fdist > 0) {
        const force = (1 - fdist / 220) * 3.5
        featured.vx += fdx / fdist * force
        featured.vy += fdy / fdist * force
      }
      const fspd = Math.sqrt(featured.vx * featured.vx + featured.vy * featured.vy)
      if (fspd > 7) { featured.vx = featured.vx / fspd * 7; featured.vy = featured.vy / fspd * 7 }
      if (fspd < 0.5) { featured.vx += (Math.random() - 0.5) * 0.5; featured.vy += (Math.random() - 0.5) * 0.5 }
      featured.x += featured.vx; featured.y += featured.vy
      featured.angle += 0.025
      if (featured.x < 30) { featured.x = 30; featured.vx = Math.abs(featured.vx) }
      if (featured.x > W - 30) { featured.x = W - 30; featured.vx = -Math.abs(featured.vx) }
      if (featured.y < 30) { featured.y = 30; featured.vy = Math.abs(featured.vy) }
      if (featured.y > H - 30) { featured.y = H - 30; featured.vy = -Math.abs(featured.vy) }
      drawFeatured(ctx, featured)

      // Falling sparks
      sparks.forEach(s => {
        s.y += s.vy
        if (s.y > H) { s.y = -s.h; s.x = Math.random() * W }
        ctx.globalAlpha = s.alpha
        ctx.fillStyle = s.color
        ctx.fillRect(s.x, s.y, s.w, s.h)
      })
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-10 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export function HeroCanvas() {
  return (
    <section
      aria-label="Hero"
      style={{
        minHeight: '92vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#080e1f',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-gradient-text {
          background: linear-gradient(90deg, #52C9A0, #4A7FE5, #FF6B2B, #52C9A0);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s ease infinite;
        }
      `}</style>

      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'linear-gradient(to bottom, rgba(8,14,31,0.4) 0%, rgba(8,14,31,0.6) 100%)',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 30, maxWidth: 1200, margin: '0 auto', padding: '96px 24px 80px', width: '100%' }}>
        <div style={{ maxWidth: 760 }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(82,201,160,0.15)', border: '1px solid rgba(82,201,160,0.3)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 24,
          }}>
            <span style={{ color: '#52C9A0', fontSize: '0.85rem', fontWeight: 600 }}>
              AI-Powered Demand Generation — Northern California &amp; Beyond
            </span>
          </div>

          {/* H1 */}
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, color: '#fff' }}>
            <span style={{ color: '#fff' }}>We Make You </span>
            <span style={{ color: '#52C9A0' }}>The Signal </span>
            <span style={{ color: '#FF6B2B' }}>Not The Noise.</span>
          </h1>

          {/* Tagline */}
          <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: 'rgba(255,255,255,0.72)', maxWidth: 620, marginBottom: 40, lineHeight: 1.65 }}>
            Demand Signals builds AI-powered systems that put your business in front of the right buyers — across search, social, and every channel that matters.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/contact" style={{
              display: 'inline-flex', alignItems: 'center', padding: '16px 36px',
              background: '#FF6B2B',
              color: '#fff', fontWeight: 700, fontSize: '1.05rem', borderRadius: 100,
              boxShadow: '0 4px 24px rgba(255,107,43,0.4)', textDecoration: 'none',
            }}>
              Get Started Free →
            </Link>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={{
              display: 'inline-flex', alignItems: 'center', padding: '15px 34px',
              border: '2px solid rgba(255,255,255,0.5)', color: '#fff',
              background: 'rgba(255,255,255,0.15)',
              fontWeight: 600, fontSize: '1.05rem', borderRadius: 100, textDecoration: 'none',
            }}>
              Book a Free Call
            </a>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 30,
      }}>
        Scroll
        <span style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.2)', display: 'block' }} />
      </div>
    </section>
  )
}
