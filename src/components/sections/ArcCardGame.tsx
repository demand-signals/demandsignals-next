'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { BOOKING_URL } from '@/lib/constants'

const LOGO = '/dsig-icon.png'

// 9 unique card patterns — each appears twice (18 total cards)
const CARD_PATTERNS = [
  [0, 'arc-p0', '<svg viewBox="0 0 100 100" fill="none"><polygon points="50,8 90,29 90,71 50,92 10,71 10,29" stroke="#52C9A0" stroke-width="4"/></svg>'],
  [1, 'arc-p1', '<svg viewBox="0 0 100 100" fill="none"><polygon points="50,12 90,82 10,82" stroke="#FF6B2B" stroke-width="4"/></svg>'],
  [2, 'arc-p2', '<svg viewBox="0 0 100 100" fill="none"><polygon points="50,10 88,50 50,90 12,50" stroke="#7B8FE0" stroke-width="4"/></svg>'],
  [3, 'arc-p3', '<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="36" stroke="#52C9A0" stroke-width="3.5"/><circle cx="50" cy="50" r="20" stroke="#52C9A0" stroke-width="3"/><circle cx="50" cy="50" r="5" fill="#52C9A0"/></svg>'],
  [4, 'arc-p4', '<svg viewBox="0 0 100 100" fill="none"><polygon points="28,18 28,82 82,50" stroke="#FF6B2B" stroke-width="3.5" stroke-linejoin="round"/></svg>'],
  [5, 'arc-p5', '<svg viewBox="0 0 100 100" fill="none"><rect x="22" y="22" width="56" height="56" stroke="#A78BFA" stroke-width="4" transform="rotate(12 50 50)"/></svg>'],
  [6, 'arc-p0', '<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="5" fill="#52C9A0"/><circle cx="26" cy="50" r="4" fill="#52C9A0" opacity=".7"/><circle cx="74" cy="50" r="4" fill="#52C9A0" opacity=".7"/><circle cx="50" cy="26" r="4" fill="#52C9A0" opacity=".7"/><circle cx="50" cy="74" r="4" fill="#52C9A0" opacity=".7"/><circle cx="32" cy="32" r="3" fill="#52C9A0" opacity=".45"/><circle cx="68" cy="32" r="3" fill="#52C9A0" opacity=".45"/><circle cx="32" cy="68" r="3" fill="#52C9A0" opacity=".45"/><circle cx="68" cy="68" r="3" fill="#52C9A0" opacity=".45"/></svg>'],
  [7, 'arc-p1', '<svg viewBox="0 0 100 100" fill="none"><line x1="50" y1="14" x2="50" y2="86" stroke="#FF6B2B" stroke-width="4" stroke-linecap="round"/><line x1="14" y1="50" x2="86" y2="50" stroke="#FF6B2B" stroke-width="4" stroke-linecap="round"/></svg>'],
  [8, 'arc-p2', '<svg viewBox="0 0 100 100" fill="none"><polyline points="30,20 70,50 30,80" stroke="#7B8FE0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
] as const

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Card = {
  uid: number
  id: number
  paletteClass: string
  svgHTML: string
  flipped: boolean
  matched: boolean
}

function buildDeck(): Card[] {
  let uid = 0
  return shuffle([...CARD_PATTERNS, ...CARD_PATTERNS].map(([id, pal, svg]) => ({
    uid: uid++,
    id,
    paletteClass: pal,
    svgHTML: svg,
    flipped: false,
    matched: false,
  })))
}

export function ArcCardGame() {
  const pathname = usePathname()
  const [cards, setCards] = useState<Card[]>([])
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  const [finalMoves, setFinalMoves] = useState(0)
  const lockRef = useRef(false)
  const selectedRef = useRef<number[]>([])
  const movesRef = useRef(0)

  useEffect(() => { setCards(buildDeck()) }, [])

  const cardsRef = useRef<Card[]>([])

  // Keep cardsRef in sync
  useEffect(() => { cardsRef.current = cards }, [cards])

  const handleCardClick = useCallback((uid: number) => {
    if (lockRef.current) return
    const prev = cardsRef.current
    const card = prev.find(c => c.uid === uid)
    if (!card || card.flipped || card.matched) return
    if (selectedRef.current.length >= 2) return

    // Flip the clicked card
    const next = prev.map(c => c.uid === uid ? { ...c, flipped: true } : c)
    selectedRef.current = [...selectedRef.current, uid]

    if (selectedRef.current.length === 2) {
      const [aUid, bUid] = selectedRef.current
      const a = next.find(c => c.uid === aUid)!
      const b = next.find(c => c.uid === bUid)!

      movesRef.current += 1
      setMoves(movesRef.current)

      if (a.id === b.id) {
        // Match
        const matched = next.map(c =>
          c.uid === aUid || c.uid === bUid ? { ...c, matched: true } : c
        )
        selectedRef.current = []
        cardsRef.current = matched
        setCards(matched)
        const matchedCount = matched.filter(c => c.matched).length
        if (matchedCount === CARD_PATTERNS.length * 2) {
          const m = movesRef.current
          setTimeout(() => { setFinalMoves(m); setWon(true) }, 500)
        }
        return
      } else {
        // No match — flip back after delay
        lockRef.current = true
        cardsRef.current = next
        setCards(next)
        setTimeout(() => {
          const flippedBack = cardsRef.current.map(c =>
            c.uid === aUid || c.uid === bUid ? { ...c, flipped: false } : c
          )
          cardsRef.current = flippedBack
          setCards(flippedBack)
          selectedRef.current = []
          lockRef.current = false
        }, 900)
        return
      }
    }

    cardsRef.current = next
    setCards(next)
  }, [])

  const reset = useCallback(() => {
    lockRef.current = false
    selectedRef.current = []
    movesRef.current = 0
    setCards(buildDeck())
    setMoves(0)
    setWon(false)
    setFinalMoves(0)
  }, [])

  const confettiRef = useRef<HTMLCanvasElement>(null)

  const fireConfetti = useCallback(() => {
    const canvas = confettiRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#FF6B2B', '#52C9A0', '#7B8FE0', '#A78BFA', '#FFD700', '#FF4081']
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; rot: number; rv: number; life: number }[] = []
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2, y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 - 5,
        r: Math.random() * 6 + 3, color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2, rv: (Math.random() - 0.5) * 0.3, life: 1,
      })
    }
    let frame: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true
        p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.rot += p.rv; p.life -= 0.012
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color
        ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2)
        ctx.restore()
      }
      if (alive) { frame = requestAnimationFrame(animate) }
      else { ctx.clearRect(0, 0, canvas.width, canvas.height) }
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [])

  if (pathname === '/spacegame') return null

  return (
    <section style={{
      width: '100%',
      background: 'rgb(8, 12, 18)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '64px 40px 80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <style>{`
        .arc-card{aspect-ratio:1;border-radius:12px;cursor:pointer;position:relative;transform-style:preserve-3d;transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);user-select:none;}
        .arc-card.flipped,.arc-card.matched{transform:rotateY(180deg);}
        .arc-card.matched{cursor:default;}
        .arc-face{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;}
        .arc-back{background:#1a2030 url('${LOGO}') center/55% no-repeat;border:1.5px solid #2a3448;transition:border-color 0.2s;}
        .arc-card:not(.flipped):not(.matched):hover .arc-back{border-color:#52C9A0;background:#1e2840 url('${LOGO}') center/55% no-repeat;}
        .arc-front{transform:rotateY(180deg);}
        .arc-card.matched .arc-front{box-shadow:0 0 0 2px #52C9A0,0 0 18px rgba(82,201,160,0.25);}
        .arc-p0{background:#1a3040;}.arc-p1{background:#2a1f10;}.arc-p2{background:#1a1f35;}.arc-p3{background:#101a20;}.arc-p4{background:#1f2a1a;}.arc-p5{background:#251520;}
        .arc-front svg{width:52%;height:52%;}
        @media(max-width:600px){.arc-grid-inner{grid-template-columns:repeat(3,1fr)!important;}}
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64, maxWidth: 760 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#52C9A0', marginBottom: 12 }}>
          Play &amp; Learn
        </p>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
          Games are Good
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#d1d5db', lineHeight: 1.6 }}>
          Playing games with your business is not. Trust Demand Signals to put the pieces together and deliver new results for your company.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 780, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'rgb(139,148,158)' }}>
          <strong style={{ color: 'rgb(230,237,243)' }}>Pick a card.</strong> Match a card.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={reset}
            style={{ background: 'transparent', border: '1.5px solid #52C9A0', color: '#52C9A0', padding: '6px 18px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.5px' }}
          >
            Play again
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgb(139,148,158)' }}>
            Moves
            <span style={{ background: 'rgb(33,38,45)', border: '1px solid rgb(48,54,61)', color: 'rgb(230,237,243)', padding: '4px 12px', borderRadius: 5, fontSize: 13, fontWeight: 600, minWidth: 42, textAlign: 'center' }}>
              {moves}
            </span>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div
        className="arc-grid-inner"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, maxWidth: 900, width: '100%' }}
      >
        {cards.map(card => (
          <div
            key={card.uid}
            className={`arc-card${card.flipped ? ' flipped' : ''}${card.matched ? ' matched' : ''}`}
            onClick={() => handleCardClick(card.uid)}
          >
            <div className="arc-face arc-back" />
            <div
              className={`arc-face arc-front ${card.paletteClass}`}
              dangerouslySetInnerHTML={{ __html: card.svgHTML }}
            />
          </div>
        ))}
      </div>

      {/* Win modal */}
      {won && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { reset() } }}
        >
          <canvas ref={confettiRef} style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }} />
          <div style={{
            background: 'linear-gradient(135deg, #0d1420 0%, #1d2330 100%)',
            border: '1px solid rgba(82,201,160,0.3)',
            borderRadius: 20, padding: '48px 40px', maxWidth: 460, width: '100%',
            textAlign: 'center', position: 'relative', zIndex: 10001,
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎯</div>
            <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
              {finalMoves} Moves. All Matched.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32 }}>
              Now imagine what we could do for your business.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={reset}
                style={{
                  background: 'var(--dark)', color: '#fff', fontWeight: 700,
                  padding: '14px 28px', borderRadius: 100, border: 'none',
                  cursor: 'pointer', fontSize: '0.95rem', transition: 'transform 0.2s',
                }}
              >
                Play Again
              </button>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#FF6B2B', color: '#fff', fontWeight: 700,
                  padding: '14px 28px', borderRadius: 100, textDecoration: 'none',
                  fontSize: '0.95rem', display: 'block', transition: 'transform 0.2s',
                }}
              >
                Schedule a Call
              </a>
              <a
                href="/spacegame"
                style={{
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  fontWeight: 600, padding: '10px 28px', borderRadius: 100,
                  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                  fontSize: '0.85rem', transition: 'color 0.2s, border-color 0.2s',
                  textDecoration: 'none', display: 'block', textAlign: 'center',
                }}
              >
                🥚 Easter Egg
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
