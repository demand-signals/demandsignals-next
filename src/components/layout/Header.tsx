'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NavDropdownPanel } from './NavDropdownPanel'
import { MobileMenu } from './MobileMenu'
import {
  LOGO_URL,
  BOOKING_URL,
  NAV_SERVICES,
  NAV_AI_AGENTS,
  NAV_TOOLS,
} from '@/lib/constants'
import styles from './header.module.css'

type DropdownKey = 'services' | 'ai' | 'tools' | null

const DROPDOWN_ITEMS: { key: DropdownKey; label: string; items: typeof NAV_SERVICES }[] = [
  { key: 'services', label: 'Services',   items: NAV_SERVICES   },
  { key: 'ai',       label: 'AI & Agents', items: NAV_AI_AGENTS  },
  { key: 'tools',    label: 'Tools',       items: NAV_TOOLS      },
]

const DIRECT_LINKS = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Blog',      href: '/blog'      },
  { label: 'About',     href: '/about'     },
]

export function Header() {
  const [open,       setOpen]       = useState<DropdownKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPath = usePathname()
  useEffect(() => { setOpen(null); setMobileOpen(false) }, [currentPath])

  const handleMouseEnter = (key: DropdownKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(key)
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }

  return (
    <header className={styles.header}>
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
                  <span className={[styles.chevron, open === key && styles.chevronOpen].filter(Boolean).join(' ')} />
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
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener"
              className={styles.btnOutline}
            >
              Book a Call
            </a>
            <Link href="/contact" className={styles.btnPrimary}>
              Get a Quote
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
