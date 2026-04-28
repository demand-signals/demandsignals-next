'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOOKING_URL } from '@/lib/constants'

export function ContactBot() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Hide on customer-facing magic-link document pages and admin.
  if (pathname?.startsWith('/admin')) return null
  if (pathname?.startsWith('/sow/')) return null
  if (pathname?.startsWith('/invoice/')) return null
  if (pathname?.startsWith('/quote/s/')) return null

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 500 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 12,
          background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          padding: 20, width: 260, border: '1px solid var(--border)',
        }}>
          <p style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: 4, fontSize: '0.95rem' }}>Hi! 👋 Ready to grow?</p>
          <p style={{ color: 'var(--slate)', fontSize: '0.85rem', marginBottom: 16 }}>
            Let's talk about your demand generation goals. Choose how you'd like to connect.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={{
              display: 'block', textAlign: 'center', padding: '10px 16px',
              background: 'linear-gradient(135deg, var(--teal), var(--teal-dark))',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem', borderRadius: 8,
            }}>📅 Book a Free Call</a>
            <Link href="/contact" onClick={() => setOpen(false)} style={{
              display: 'block', textAlign: 'center', padding: '9px 16px',
              border: '1.5px solid var(--teal)', color: 'var(--teal)',
              fontWeight: 600, fontSize: '0.875rem', borderRadius: 8,
            }}>✉️ Send a Message</Link>
            <Link href="/tools/research-reports" onClick={() => setOpen(false)} style={{
              display: 'block', textAlign: 'center', padding: '9px 16px',
              border: '1.5px solid var(--border)', color: 'var(--slate)',
              fontWeight: 600, fontSize: '0.875rem', borderRadius: 8,
            }}>📋 Get a Free Report</Link>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--teal), var(--teal-dark))',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(104,197,173,0.5)', fontSize: '1.4rem', transition: 'transform var(--t)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  )
}
