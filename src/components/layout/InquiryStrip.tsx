'use client'

// InquiryStrip — slim sitewide lead-capture form rendered above the
// footer on every page (mounted in root layout.tsx). Posts to the
// existing /api/inquiry endpoint with source='inquiry_strip', which
// fans out via recordInquiry() → Resend email + Twilio SMS + page_visit.

import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

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
      aria-label="Quick inquiry"
      style={{
        background: 'linear-gradient(135deg, #1d2330 0%, #2a3448 100%)',
        padding: '48px 24px',
        borderTop: '1px solid rgba(82,201,160,0.18)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {submitted ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 14, color: '#52C9A0', textAlign: 'center', padding: '20px 0',
          }}>
            <CheckCircle2 style={{ width: 28, height: 28 }} />
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                Got it — we’ll be in touch within one business day.
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                Want to skip the wait? <a href="/book" style={{ color: '#52C9A0', textDecoration: 'underline' }}>Book a call now →</a>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 40, alignItems: 'center',
          }} className="inquiry-strip-grid">
            <div>
              <div style={{
                color: '#52C9A0', fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Get a Reply
              </div>
              <h3 style={{
                color: '#fff', fontSize: 'clamp(1.3rem, 2.3vw, 1.7rem)', fontWeight: 800,
                margin: '0 0 8px', lineHeight: 1.2,
              }}>
                Question, quote, or just curious?
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem',
                lineHeight: 1.5, margin: 0,
              }}>
                Drop your details and we’ll reply within one business day.
                Or <a href="/book" style={{ color: '#52C9A0', textDecoration: 'underline' }}>book a 20-min call</a>.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            }} className="inquiry-strip-form">
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
                placeholder="What can we help with? (optional)"
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
                  color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                  borderRadius: 100, border: 'none',
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
              >
                {submitting ? 'Sending…' : (
                  <>
                    Send inquiry
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .inquiry-strip-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .inquiry-strip-form { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
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
