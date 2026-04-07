'use client'

import { useMemo } from 'react'

// Shape generators — each returns an SVG element string
const shapes = [
  // Triangle
  (x: number, y: number, s: number, r: number) =>
    `<polygon points="${s/2},0 ${s},${s*0.85} 0,${s*0.85}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`,
  // Diamond
  (x: number, y: number, s: number, r: number) =>
    `<polygon points="0,${s/2} ${s/2},0 ${s},${s/2} ${s/2},${s}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`,
  // Hexagon
  (x: number, y: number, s: number, r: number) => {
    const h = s * 0.866
    return `<polygon points="${s/4},0 ${s*3/4},0 ${s},${h/2} ${s*3/4},${h} ${s/4},${h} 0,${h/2}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`
  },
  // Circle
  (x: number, y: number, s: number) =>
    `<circle cx="${x + s/2}" cy="${y + s/2}" r="${s/2}" fill="none" stroke="#c0ccc4" stroke-width="1.2"/>`,
  // Pentagon
  (x: number, y: number, s: number, r: number) =>
    `<polygon points="${s/2},0 ${s},${s*0.38} ${s*0.81},${s} ${s*0.19},${s} 0,${s*0.38}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`,
  // Square (rotated)
  (x: number, y: number, s: number, r: number) =>
    `<rect x="0" y="0" width="${s}" height="${s}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`,
  // Star (5-point outline)
  (x: number, y: number, s: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const angle = (Math.PI / 5) * i - Math.PI / 2
      const rad = i % 2 === 0 ? s / 2 : s / 5
      return `${s/2 + rad * Math.cos(angle)},${s/2 + rad * Math.sin(angle)}`
    }).join(' ')
    return `<polygon points="${pts}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`
  },
  // Cross / plus
  (x: number, y: number, s: number, r: number) => {
    const t = s * 0.3
    return `<path d="M${t},0 L${s-t},0 L${s-t},${t} L${s},${t} L${s},${s-t} L${s-t},${s-t} L${s-t},${s} L${t},${s} L${t},${s-t} L0,${s-t} L0,${t} L${t},${t} Z" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`
  },
  // Parallelogram
  (x: number, y: number, s: number, r: number) =>
    `<polygon points="${s*0.25},0 ${s},0 ${s*0.75},${s*0.6} 0,${s*0.6}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`,
  // Arrow / chevron
  (x: number, y: number, s: number, r: number) =>
    `<polyline points="0,${s*0.3} ${s/2},0 ${s},${s*0.3}" fill="none" stroke="#c0ccc4" stroke-width="1.2" transform="translate(${x},${y}) rotate(${r})"/>`,
]

// Seeded PRNG to avoid server/client hydration mismatch
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateShapes(): string {
  const rand = mulberry32(42)
  const count = 18 + Math.floor(rand() * 8) // 18-25 shapes
  const svgParts: string[] = []

  for (let i = 0; i < count; i++) {
    const shapeIdx = Math.floor(rand() * shapes.length)
    const x = rand() * 1350 - 50
    const y = rand() * 550 - 30
    const size = 25 + rand() * 45
    const rotation = Math.floor(rand() * 360)
    svgParts.push(shapes[shapeIdx](x, y, size, rotation))
  }

  return svgParts.join('')
}

export function ShapeBg() {
  const svgContent = useMemo(() => generateShapes(), [])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      opacity: 0.3,
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1300 500"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}
