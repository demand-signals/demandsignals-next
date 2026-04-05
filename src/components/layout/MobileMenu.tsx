import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'
import styles from './mobileMenu.module.css'
import headerStyles from './header.module.css'

const NAV_ITEMS = [
  { label: 'Services',              href: '/services'               },
  { label: '↳ WordPress Sites',     href: '/services/wordpress'     },
  { label: '↳ React / Next.js Apps',href: '/services/nextjs-webapps'},
  { label: '↳ Vibe Coded WebApps',  href: '/services/vibe-coded'    },
  { label: '↳ iOS & Android Apps',  href: '/services/mobile-apps'   },
  { label: '↳ UI/UX Design',        href: '/services/ui-ux-design'  },
  { label: 'AI & Agents',           href: '/ai-agents'              },
  { label: 'Tools',                 href: '/tools'                  },
  { label: 'Portfolio',             href: '/portfolio'              },
  { label: 'Blog',                  href: '/blog'                   },
  { label: 'About',                 href: '/about'                  },
]

type Props = {
  onClose: () => void
}

export function MobileMenu({ onClose }: Props) {
  return (
    <div className={styles.menu}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={styles.menuLink}
          style={item.label.startsWith('↳') ? { paddingLeft: 28, fontSize: '0.85rem', opacity: 0.8 } : undefined}
        >
          {item.label}
        </Link>
      ))}

      <div className={styles.ctaRow}>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener"
          className={`${headerStyles.btnOutline} ${styles.ctaFlex}`}
        >
          Book a Call
        </a>
        <Link
          href="/contact"
          onClick={onClose}
          className={`${headerStyles.btnPrimary} ${styles.ctaFlex}`}
        >
          Get a Quote
        </Link>
      </div>
    </div>
  )
}
