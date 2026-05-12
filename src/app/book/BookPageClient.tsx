'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, Calendar, AlertCircle } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/constants'

interface AvailableSlot {
  id: string
  start_at: string
  end_at: string
  display_label: string
}

interface ConfirmedBooking {
  start_at: string
  end_at: string
  meet_link: string
  attendee_email: string
}

type LoadState = 'loading' | 'ready' | 'unavailable' | 'error'

export function BookPageClient() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [context, setContext] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/book/slots', { method: 'GET' })
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) {
          setLoadState(res.status === 503 ? 'unavailable' : 'error')
          return
        }
        setSlots(data.slots || [])
        setLoadState((data.slots || []).length > 0 ? 'ready' : 'unavailable')
      } catch {
        if (!cancelled) setLoadState('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlotId) {
      setSubmitError('Please pick a time slot first.')
      return
    }
    if (!email) {
      setSubmitError('Please enter your email.')
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/book/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          attendee_email: email,
          attendee_name: name || undefined,
          context_for_summary: name ? `Strategy call with ${name}` : undefined,
          context_for_description: context || undefined,
          website, // honeypot
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.')
        if (res.status === 409 || res.status === 400) {
          // Slot taken or invalid — refresh slots
          try {
            const r2 = await fetch('/api/book/slots')
            const d2 = await r2.json()
            if (d2.ok) setSlots(d2.slots || [])
          } catch { /* swallow */ }
          setSelectedSlotId(null)
        }
        return
      }
      setConfirmed({
        start_at: data.start_at,
        end_at: data.end_at,
        meet_link: data.meet_link,
        attendee_email: email,
      })
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Confirmed state ──
  if (confirmed) {
    const d = new Date(confirmed.start_at)
    const dayLabel = d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      timeZone: 'America/Los_Angeles',
    })
    const timeLabel = d.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'America/Los_Angeles',
    })
    return (
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 32px',
        boxShadow: '0 10px 30px rgba(16,24,40,0.08)', border: '1px solid #d1fae5',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <CheckCircle2 style={{ width: 32, height: 32, color: '#059669', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#064e3b', margin: '0 0 6px' }}>
              You’re booked.
            </h2>
            <p style={{ fontSize: '1rem', color: '#065f46', margin: 0, lineHeight: 1.55 }}>
              {dayLabel} at {timeLabel} PT
            </p>
          </div>
        </div>
        {confirmed.meet_link && (
          <a
            href={confirmed.meet_link}
            target="_blank"
            rel="noopener"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', background: '#059669', color: '#fff',
              fontWeight: 700, fontSize: '0.95rem', borderRadius: 100,
              textDecoration: 'none', marginBottom: 16,
            }}
          >
            Join Google Meet <ExternalLink style={{ width: 16, height: 16 }} />
          </a>
        )}
        <p style={{ fontSize: '0.9rem', color: '#065f46', margin: '8px 0 0', lineHeight: 1.5 }}>
          Calendar invite sent to <strong>{confirmed.attendee_email}</strong>.
          You’ll get reminder messages 24 hours and 1 hour before.
        </p>
        <p style={{ fontSize: '0.85rem', color: '#065f46', margin: '16px 0 0', paddingTop: 16, borderTop: '1px solid #d1fae5' }}>
          Need to reschedule? Reply to the calendar invite or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#059669', fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    )
  }

  // ── Loading state ──
  if (loadState === 'loading') {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, padding: '60px 32px', textAlign: 'center',
        boxShadow: '0 4px 16px rgba(16,24,40,0.06)',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--slate, #5d6780)' }}>
          <Calendar style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: '0.95rem' }}>Loading available times…</span>
        </div>
      </div>
    )
  }

  // ── Calendar unavailable fallback ──
  if (loadState === 'unavailable' || loadState === 'error') {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 32px',
        boxShadow: '0 4px 16px rgba(16,24,40,0.06)', border: '1px solid #fde68a',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <AlertCircle style={{ width: 26, height: 26, color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark, #1d2330)', margin: '0 0 6px' }}>
              {loadState === 'unavailable' ? 'No slots available right now' : 'Booking temporarily unavailable'}
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--slate, #5d6780)', margin: 0, lineHeight: 1.55 }}>
              Drop us an email and we’ll get back to you within one business day with available times.
            </p>
          </div>
        </div>
        <a
          href="/contact"
          style={{
            display: 'inline-block', padding: '12px 28px', background: '#FF6B2B',
            color: '#fff', fontWeight: 700, fontSize: '0.95rem', borderRadius: 100,
            textDecoration: 'none', marginTop: 8,
          }}
        >
          Go to contact form →
        </a>
      </div>
    )
  }

  // ── Ready: slot picker + form ──
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff', borderRadius: 16, padding: '36px 32px',
        boxShadow: '0 4px 16px rgba(16,24,40,0.06)',
      }}
    >
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dark, #1d2330)', margin: '0 0 6px' }}>
        Pick a time
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--slate, #5d6780)', margin: '0 0 24px' }}>
        All times Pacific. 20 minutes by Google Meet.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10, marginBottom: 28,
      }}>
        {slots.map((slot) => {
          const selected = selectedSlotId === slot.id
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlotId(slot.id)}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: selected ? '2px solid #52C9A0' : '2px solid #e6eaf0',
                background: selected ? 'rgba(82,201,160,0.08)' : '#fff',
                color: selected ? '#0a5d4d' : 'var(--dark, #1d2330)',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {slot.display_label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <Field label="Your name" htmlFor="book-name">
          <input
            id="book-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
            style={inputStyle}
          />
        </Field>
        <Field label="Email" htmlFor="book-email" required>
          <input
            id="book-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            autoComplete="email"
            required
            style={inputStyle}
          />
        </Field>
        <Field label="What would you like to cover?" htmlFor="book-context">
          <textarea
            id="book-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional — one line is fine. Helps us prep."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>
        {/* Honeypot — visually hidden, bots fill it */}
        <div style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
          <label htmlFor="book-website">Website</label>
          <input
            id="book-website"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </div>

      {submitError && (
        <div style={{
          padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, color: '#991b1b', fontSize: '0.9rem', marginBottom: 16,
        }}>
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !selectedSlotId}
        style={{
          width: '100%', padding: '16px 28px', background: submitting || !selectedSlotId ? '#cbd5e1' : '#FF6B2B',
          color: '#fff', fontWeight: 700, fontSize: '1rem', borderRadius: 100,
          border: 'none', cursor: submitting || !selectedSlotId ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'background 0.15s',
        }}
      >
        {submitting ? 'Booking…' : 'Confirm booking →'}
      </button>

      <p style={{ fontSize: '0.78rem', color: 'var(--slate, #5d6780)', margin: '16px 0 0', textAlign: 'center' }}>
        Calendar invite + Google Meet link sent immediately. No spam, ever.
      </p>
    </form>
  )
}

function Field({ label, htmlFor, required, children }: {
  label: string; htmlFor: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} style={{
        display: 'block', fontSize: '0.85rem', fontWeight: 600,
        color: 'var(--dark, #1d2330)', marginBottom: 6,
      }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #e6eaf0',
  borderRadius: 10,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  background: '#fff',
  color: 'var(--dark, #1d2330)',
  outline: 'none',
  boxSizing: 'border-box',
}
