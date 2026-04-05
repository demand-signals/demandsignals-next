'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LOGO_URL, BOOKING_URL, NAV_SERVICES, NAV_AI, NAV_TOOLS, NAV_LOCATIONS } from '@/lib/constants'

type DropdownKey = 'services' | 'ai' | 'tools' | 'locations' | null

export function Header() {
  const [open, setOpen] = useState<DropdownKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close dropdown on route change
  useEffect(() => { setOpen(null); setMobileOpen(false) }, [pathname])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key: DropdownKey) => setOpen(prev => prev === key ? null : key)

  return (
    <header
      ref={ref}
      style={{ background: 'var(--dark)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image src={LOGO_URL} alt="Demand Signals" width={160} height={40} style={{ height: 40, width: 'auto', objectFit: 'contain' }} priority />
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden-mobile">
          {/* Services */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => toggle('services')} style={navBtnStyle}>
              Services <span style={{ fontSize: '0.7em', marginLeft: 4, display: 'inline-block', transition: 'transform 0.2s', transform: open === 'services' ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {open === 'services' && <Dropdown items={NAV_SERVICES} onClose={() => setOpen(null)} />}
          </div>
          {/* AI & Agents */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => toggle('ai')} style={navBtnStyle}>
              AI &amp; Agents <span style={{ fontSize: '0.7em', marginLeft: 4, display: 'inline-block', transition: 'transform 0.2s', transform: open === 'ai' ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {open === 'ai' && <Dropdown items={NAV_AI} onClose={() => setOpen(null)} />}
          </div>
          {/* Tools */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => toggle('tools')} style={navBtnStyle}>
              Tools <span style={{ fontSize: '0.7em', marginLeft: 4, display: 'inline-block', transition: 'transform 0.2s', transform: open === 'tools' ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {open === 'tools' && <Dropdown items={NAV_TOOLS} hasBadge onClose={() => setOpen(null)} />}
          </div>
          {/* Locations */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => toggle('locations')} style={navBtnStyle}>
              Locations <span style={{ fontSize: '0.7em', marginLeft: 4, display: 'inline-block', transition: 'transform 0.2s', transform: open === 'locations' ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {open === 'locations' && <Dropdown items={NAV_LOCATIONS} onClose={() => setOpen(null)} />}
          </div>

          <Link href="/portfolio" style={navBtnStyle}>Portfolio</Link>
          <Link href="/blog" style={navBtnStyle}>Blog</Link>
          <Link href="/about" style={navBtnStyle}>About</Link>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={outlineBtnStyle}>
              Book a Call
            </a>
            <Link href="/contact" style={primaryBtnStyle}>
              Get a Quote
            </Link>
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(p => !p)}
          aria-label="Toggle navigation"
          style={{ display: 'none', flexDirection: 'column', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          className="show-mobile"
        >
          <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: 'var(--dark-2)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px 24px' }}>
          {[
            { label: 'Services', href: '/services' },
            { label: 'AI & Agents', href: '/ai-agents' },
            { label: 'Tools', href: '/tools' },
            { label: 'Locations', href: '/locations' },
            { label: 'Portfolio', href: '/portfolio' },
            { label: 'Blog', href: '/blog' },
            { label: 'About', href: '/about' },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              style={{ display: 'block', color: 'rgba(255,255,255,0.8)', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.95rem' }}>
              {item.label}
            </Link>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={{ ...outlineBtnStyle, flex: 1, justifyContent: 'center' }}>Book a Call</a>
            <Link href="/contact" onClick={() => setMobileOpen(false)} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>Get a Quote</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  )
}

function Dropdown({ items, hasBadge = false, onClose }: { items: Array<{ label: string; href: string; badge?: string }>; hasBadge?: boolean; onClose: () => void }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0,
      background: 'var(--dark-2)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '8px 0', minWidth: 220, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', zIndex: 200,
    }}>
      {items.map(item => (
        <Link key={item.href} href={item.href} onClick={onClose} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', color: 'rgba(255,255,255,0.82)', fontSize: '0.875rem',
          gap: 8, transition: 'background var(--t)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <span>{item.label}</span>
          {hasBadge && 'badge' in item && item.badge && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 100,
              background: item.badge === 'Free' ? 'var(--teal)' : 'rgba(255,255,255,0.15)',
              color: item.badge === 'Free' ? '#fff' : 'rgba(255,255,255,0.55)',
            }}>{item.badge}</span>
          )}
        </Link>
      ))}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', fontWeight: 500,
  padding: '8px 12px', borderRadius: 8, transition: 'color var(--t), background var(--t)',
  fontFamily: 'inherit',
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '9px 20px',
  background: '#FF6B2B',
  color: '#fff', fontWeight: 600, fontSize: '0.875rem', borderRadius: 100,
  transition: 'transform var(--t), box-shadow var(--t)',
}

const outlineBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '8px 18px',
  border: '2px solid rgba(255,255,255,0.5)', color: '#fff',
  background: 'rgba(255,255,255,0.15)',
  fontWeight: 600, fontSize: '0.875rem', borderRadius: 100, transition: 'border-color var(--t)',
}
