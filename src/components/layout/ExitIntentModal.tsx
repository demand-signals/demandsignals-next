'use client'

// ExitIntentModal — fires once per session when the user moves cursor
// toward the top of the viewport (signal: about to leave). Mounted
// only on homepage and LTPs (via opt-in flag in layouts). Posts to
// /api/inquiry with source='exit_intent'. Honors prefers-reduced-motion
// and never re-fires within the same session.

import { useEffect, useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'

const SESSION_KEY = 'dsig_exit_intent_shown'

export function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY) === '1') return
    // Skip on small viewports — exit intent via mousemove is unreliable on touch
    if (window.matchMedia('(max-width: 768px)').matches) return

    let hasFired = false
    let armTimer: ReturnType<typeof setTimeout> | null = null
    let isArmed = false

    // Don't fire in the first 8s — too aggressive
    armTimer = setTimeout(() => { isArmed = true }, 8000)

    function onMouseOut(e: MouseEvent) {
      if (hasFired || !isArmed) return
      // Fire only when cursor leaves through the top of the viewport
      if (e.clientY > 0) return
      if (e.relatedTarget) return // hovering over a child element
      hasFired = true
      sessionStorage.setItem(SESSION_KEY, '1')
      setOpen(true)
    }

    document.addEventListener('mouseout', onMouseOut)
    return () => {
      document.removeEventListener('mouseout', onMouseOut)
      if (armTimer) clearTimeout(armTimer)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email) {
      setError('Name and email required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'exit_intent',
          name, email,
          page_url: typeof window !== 'undefined' ? window.location.pathname : '/',
          website,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,14,31,0.85)', backdropFilter: 'blur(8px)',
        padding: 24, animation: 'dsig-modal-fade 0.2s ease-out',
      }}
    >
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 20,
        maxWidth: 480, width: '100%', padding: '40px 32px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
        animation: 'dsig-modal-slide 0.25s ease-out',
      }}>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: '50%',
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--slate, #5d6780)',
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 style={{ width: 56, height: 56, color: '#059669', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark, #1d2330)', margin: '0 0 8px' }}>
              You’re on the list.
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--slate, #5d6780)', margin: '0 0 24px', lineHeight: 1.55 }}>
              We’ll send your audit checklist within one business day.
            </p>
            <a
              href="/book"
              style={{
                display: 'inline-block', padding: '12px 28px',
                background: '#FF6B2B', color: '#fff', fontWeight: 700,
                fontSize: '0.95rem', borderRadius: 100, textDecoration: 'none',
              }}
            >
              Or book a 20-min call now →
            </a>
          </div>
        ) : (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', background: 'rgba(255,107,43,0.12)',
              color: '#c2410c', borderRadius: 100, fontSize: '0.7rem',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              Before You Go
            </div>
            <h2 id="exit-intent-title" style={{
              fontSize: '1.6rem', fontWeight: 800, color: 'var(--dark, #1d2330)',
              margin: '0 0 12px', lineHeight: 1.2, letterSpacing: '-0.01em',
            }}>
              Get our free local-business audit checklist.
            </h2>
            <p style={{
              fontSize: '0.95rem', color: 'var(--slate, #5d6780)',
              margin: '0 0 24px', lineHeight: 1.55,
            }}>
              The same 23-point checklist we use on every prospect call —
              SEO, GEO, reviews, and site performance. Free, no strings.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name" required autoComplete="name"
                style={modalInputStyle}
                aria-label="Your name"
              />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email" required autoComplete="email"
                style={modalInputStyle}
                aria-label="Email"
              />
              {/* Honeypot */}
              <div style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
                <input
                  type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1} autoComplete="off" placeholder="Website"
                />
              </div>
              {error && (
                <div style={{
                  color: '#991b1b', fontSize: '0.85rem',
                  background: '#fef2f2', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid #fecaca',
                }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '14px 28px',
                  background: submitting ? '#94a3b8' : '#FF6B2B',
                  color: '#fff', fontWeight: 700, fontSize: '1rem',
                  borderRadius: 100, border: 'none',
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit', marginTop: 4,
                }}
              >
                {submitting ? 'Sending…' : 'Send me the checklist →'}
              </button>
              <p style={{
                fontSize: '0.75rem', color: 'var(--slate, #5d6780)',
                margin: '8px 0 0', textAlign: 'center',
              }}>
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes dsig-modal-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dsig-modal-slide {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"], [role="dialog"] > div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

const modalInputStyle: React.CSSProperties = {
  padding: '12px 14px',
  border: '1.5px solid #e6eaf0',
  borderRadius: 10,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  background: '#fff',
  color: 'var(--dark, #1d2330)',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
}
