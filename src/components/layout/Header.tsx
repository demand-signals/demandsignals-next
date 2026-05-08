'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NavDropdownPanel } from './NavDropdownPanel'
import { MobileMenu } from './MobileMenu'
import { createClient } from '@/lib/supabase/client'
import {
  LOGO_URL,
  NAV_WEBSITES_APPS,
  NAV_DEMAND_GEN,
  NAV_CONTENT_SOCIAL,
  NAV_AI_SERVICES,
  NAV_LEARN,
  type NavItem,
} from '@/lib/constants'
import styles from './header.module.css'

type DropdownKey = 'websites' | 'demand' | 'content' | 'ai' | 'learn' | null

const DROPDOWN_ITEMS: { key: Exclude<DropdownKey, null>; label: string; items: NavItem[] }[] = [
  { key: 'websites', label: 'Websites & Apps',    items: NAV_WEBSITES_APPS  },
  { key: 'demand',   label: 'Demand Generation',  items: NAV_DEMAND_GEN     },
  { key: 'content',  label: 'Content & Social',   items: NAV_CONTENT_SOCIAL },
  { key: 'ai',       label: 'AI & Agents',        items: NAV_AI_SERVICES    },
  { key: 'learn',    label: 'Learn',              items: NAV_LEARN          },
]

const DIRECT_LINKS: { label: string; href: string }[] = []

export function Header() {
  const [open,       setOpen]       = useState<DropdownKey>(null)
  const [scrolled,   setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName,   setUserName]   = useState<string | null>(null)
  const [isAdmin,    setIsAdmin]    = useState(false)
  const [isClient,   setIsClient]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPath = usePathname()
  useEffect(() => { setOpen(null); setMobileOpen(false) }, [currentPath])

  // Check auth state. Resolves both user metadata (first name) and
  // role flags (admin/client) so the button renders the right way.
  useEffect(() => {
    const supabase = createClient()

    function setFromUser(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) {
      if (!user) {
        setUserName(null)
        setIsAdmin(false)
        setIsClient(false)
        return
      }
      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>
      const firstName = meta?.full_name?.split(' ')[0]
        || meta?.name?.split(' ')[0]
        || meta?.given_name
        || user.email?.split('@')[0]
        || 'Account'
      setUserName(firstName)
      // Resolve role flags via API. Done lazily after we know there's a user.
      fetch('/api/me')
        .then((r) => r.json())
        .then((d) => {
          setIsAdmin(!!d.isAdmin)
          setIsClient(!!d.isClient)
        })
        .catch(() => { setIsAdmin(false); setIsClient(false) })
    }

    supabase.auth.getUser().then(({ data: { user } }) => setFromUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) =>
      setFromUser(session?.user ?? null),
    )
    return () => subscription.unsubscribe()
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('[data-user-menu]')) setUserMenuOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [userMenuOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleMouseEnter = (key: DropdownKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(key)
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }

  const headerClass = [styles.header, scrolled ? styles.headerScrolled : ''].filter(Boolean).join(' ')

  return (
    <header className={headerClass}>
      <div className={styles.inner}>

        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <Image
            src={LOGO_URL}
            alt="Demand Signals"
            width={160}
            height={40}
            className={styles.logoImage}
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className={styles.desktopNav}>
          <nav className={styles.navLinks}>

            {/* Dropdown items */}
            {DROPDOWN_ITEMS.map(({ key, label, items }) => (
              <div
                key={key}
                className={styles.navItem}
                onMouseEnter={() => handleMouseEnter(key)}
                onMouseLeave={handleMouseLeave}
              >
                <button className={styles.navTrigger}>
                  {label}
                  <span className={[styles.caret, open === key ? styles.caretOpen : ''].filter(Boolean).join(' ')}>
                    ›
                  </span>
                </button>
                {open === key && (
                  <div className={styles.dropdown}>
                    <NavDropdownPanel items={items} onClose={() => setOpen(null)} />
                  </div>
                )}
              </div>
            ))}

            {/* Direct links */}
            {DIRECT_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className={styles.navLink}>
                {label}
              </Link>
            ))}
          </nav>

          <div className={styles.ctaGroup}>
            {!userName ? (
              <Link href="/admin-login" className={styles.btnOutline}>
                Login
              </Link>
            ) : isAdmin ? (
              <div data-user-menu style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={styles.btnOutline}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {userName}
                  <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                </button>
                {userMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: 180,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      padding: '6px 0',
                      zIndex: 100,
                    }}
                  >
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 14px', fontSize: 14, color: '#3D4566', textDecoration: 'none' }}
                    >
                      Admin Portal
                    </Link>
                    <Link
                      href="/portal"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 14px', fontSize: 14, color: '#3D4566', textDecoration: 'none' }}
                    >
                      Client Portal
                    </Link>
                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                    <Link
                      href="/auth/signout"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 14px', fontSize: 14, color: '#5d6780', textDecoration: 'none' }}
                    >
                      Sign out
                    </Link>
                  </div>
                )}
              </div>
            ) : isClient ? (
              <Link href="/portal" className={styles.btnOutline}>
                {userName}
              </Link>
            ) : (
              <Link href="/admin-login" className={styles.btnOutline}>
                {userName}
              </Link>
            )}
            <Link href="/contact" className={styles.btnPrimary}>
              Book a Call
            </Link>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          className={styles.hamburger}
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>

      </div>

      {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} />}
    </header>
  )
}
