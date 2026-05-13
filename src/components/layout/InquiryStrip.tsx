'use client'

// InquiryStrip — the single, end-of-page CTA on every public page.
// Mounted in root layout.tsx so it appears once per page.
//
// Three channels in one box (Hunter directive 2026-05-13):
//   1. Text a human at (916) 542-2423            ← tel: link, mobile-tap
//   2. Schedule a 15-min Google Meet at /book    ← native on-site booking
//   3. Send a quick note (inline form)           ← /api/inquiry, source='inquiry_strip'
//
// Replaces the previous design where two CTAs (AnimatedCTA + InquiryStrip)
// stacked back-to-back. The AnimatedCTA has been removed from the
// CategoryIndexTemplate + ServicePageTemplate so this box is the single
// conversion surface at end-of-page.

import { useState } from 'react'
import { MessageSquare, Calendar, Send, CheckCircle2 } from 'lucide-react'

const PHONE_DISPLAY = '(916) 542-2423'
const PHONE_TEL = 'tel:+19165422423'
const PHONE_SMS = 'sms:+19165422423'
const BOOK_URL = '/book'

export function InquiryStrip() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          source: 'inquiry_strip',
          name, email,
          message: message || undefined,
          page_url: typeof window !== 'undefined' ? window.location.pathname : '/',
          website, // honeypot
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

  return (
    <section
      aria-label="Contact Demand Signals"
      style={{
        background: 'linear-gradient(135deg, #1d2330 0%, #2a3448 100%)',
        padding: '64px 24px',
        borderTop: '1px solid rgba(82,201,160,0.18)',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            color: '#52C9A0', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Three Ways to Reach a Real Human
          </div>
          <h2 style={{
            color: '#fff', fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 800,
            margin: 0, lineHeight: 1.2,
          }}>
            Question, quote, or curious? Pick a channel.
          </h2>
        </div>

        {/* Three-channel grid */}
        <div
          className="inquiry-channels"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 28,
          }}
        >
          {/* Channel 1 — Text a human */}
          <a
            href={PHONE_SMS}
            style={{
              ...channelCardStyle,
              textDecoration: 'none',
            }}
          >
            <div style={iconBoxStyle('#52C9A0')}>
              <MessageSquare style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={channelTitleStyle}>Text a real human</div>
              <div style={channelMetaStyle}>{PHONE_DISPLAY} · usually a reply within minutes</div>
            </div>
          </a>

          {/* Channel 2 — Book a Meet */}
          <a
            href={BOOK_URL}
            style={{
              ...channelCardStyle,
              textDecoration: 'none',
            }}
          >
            <div style={iconBoxStyle('#FF6B2B')}>
              <Calendar style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={channelTitleStyle}>Book a 15-min Meet</div>
              <div style={channelMetaStyle}>Google Meet · pick a slot on our calendar</div>
            </div>
          </a>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          margin: '24px 0',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.78rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          or send a quick note
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Channel 3 — Inline note form */}
        {submitted ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 14, color: '#52C9A0', textAlign: 'center', padding: '20px 0',
          }}>
            <CheckCircle2 style={{ width: 28, height: 28, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                Got it — we&rsquo;ll reply within one business day.
              </div>
              <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                Want to skip the wait? <a href={BOOK_URL} style={{ color: '#52C9A0', textDecoration: 'underline' }}>Book a 15-min Meet →</a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              className="inquiry-form-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name *" required autoComplete="name"
                style={inputStyle}
                aria-label="Your name"
              />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email *" required autoComplete="email"
                style={inputStyle}
                aria-label="Email"
              />
              <input
                type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind? (optional)"
                style={{ ...inputStyle, gridColumn: '1 / -1' }}
                aria-label="Message"
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
                  gridColumn: '1 / -1', color: '#fca5a5', fontSize: '0.85rem',
                  background: 'rgba(220,38,38,0.1)', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid rgba(220,38,38,0.3)',
                }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  gridColumn: '1 / -1',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 28px',
                  background: submitting ? '#94a3b8' : '#FF6B2B',
                  color: '#fff', fontWeight: 700, fontSize: '0.98rem',
                  borderRadius: 100, border: 'none',
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
              >
                {submitting ? 'Sending…' : (
                  <>
                    Send note
                    <Send style={{ width: 16, height: 16 }} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Phone fallback — for desktop users without sms: handler. Always visible. */}
        <div style={{
          textAlign: 'center', marginTop: 22,
          color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem',
        }}>
          On a desktop? Call or text us directly at{' '}
          <a href={PHONE_TEL} style={{ color: '#52C9A0', textDecoration: 'none', fontWeight: 600 }}>
            {PHONE_DISPLAY}
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .inquiry-channels { grid-template-columns: 1fr !important; }
          .inquiry-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

const channelCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '18px 20px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'all 0.18s',
}

const iconBoxStyle = (bg: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 44,
  height: 44,
  borderRadius: 10,
  background: bg,
  flexShrink: 0,
})

const channelTitleStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 700,
  marginBottom: 3,
}

const channelMetaStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.85rem',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#fff',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}
