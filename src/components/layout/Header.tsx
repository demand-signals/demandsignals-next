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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPath = usePathname()
  useEffect(() => { setOpen(null); setMobileOpen(false) }, [currentPath])

  // Check auth state
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Extract first name from user metadata or email
        const meta = user.user_metadata
        const firstName = meta?.full_name?.split(' ')[0]
          || meta?.name?.split(' ')[0]
          || meta?.given_name
          || user.email?.split('@')[0]
          || 'Admin'
        setUserName(firstName)
      } else {
        setUserName(null)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        const firstName = meta?.full_name?.split(' ')[0]
          || meta?.name?.split(' ')[0]
          || meta?.given_name
          || session.user.email?.split('@')[0]
          || 'Admin'
        setUserName(firstName)
      } else {
        setUserName(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
            {userName ? (
              <Link href="/admin" className={styles.btnOutline}>
                {userName}
              </Link>
            ) : (
              <Link href="/admin-login" className={styles.btnOutline}>
                Client Login
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
