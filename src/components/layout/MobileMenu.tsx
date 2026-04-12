import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'
import styles from './mobileMenu.module.css'
import headerStyles from './header.module.css'

const SECTIONS = [
  {
    heading: 'Websites & Apps',
    links: [
      { label: 'WordPress Sites',      href: '/websites-apps/wordpress-development' },
      { label: 'React / Next.js Apps',  href: '/websites-apps/react-next-webapps'   },
      { label: 'iOS & Android Apps',    href: '/websites-apps/mobile-apps'           },
      { label: 'Vibe Coded Web Apps',   href: '/websites-apps/vibe-coded'            },
      { label: 'UI/UX Design',          href: '/websites-apps/design'                },
      { label: 'Agent & App Hosting',   href: '/websites-apps/hosting'               },
    ],
  },
  {
    heading: 'Demand Generation',
    links: [
      { label: 'LLM Optimization',      href: '/demand-generation/geo-aeo-llm-optimization' },
      { label: 'Local SEO',             href: '/demand-generation/local-seo'                },
      { label: 'Geo-Targeting',         href: '/demand-generation/geo-targeting'             },
      { label: 'Google Business Admin',  href: '/demand-generation/gbp-admin'                },
      { label: 'Demand Gen Systems',     href: '/demand-generation/systems'                  },
    ],
  },
  {
    heading: 'Content & Social',
    links: [
      { label: 'AI Content Generation',      href: '/content-social/ai-content-generation'      },
      { label: 'AI Social Media',            href: '/content-social/ai-social-media-management' },
      { label: 'AI Review Auto Responders',  href: '/content-social/ai-review-auto-responders'  },
      { label: 'AI Auto Blogging',           href: '/content-social/ai-auto-blogging'            },
      { label: 'AI Content Republishing',    href: '/content-social/ai-content-repurposing'      },
    ],
  },
  {
    heading: 'AI & Agent Services',
    links: [
      { label: 'AI Adoption Strategies',  href: '/ai-services/ai-automation-strategies'  },
      { label: 'AI Workforce Automation',  href: '/ai-services/ai-workforce-automation'   },
      { label: 'AI Infrastructure',        href: '/ai-services/ai-agent-infrastructure'   },
      { label: 'AI Powered Outreach',      href: '/ai-services/ai-automated-outreach'     },
      { label: 'AI Agent Swarms',          href: '/ai-services/ai-agent-swarms'            },
      { label: 'AI Private LLMs',          href: '/ai-services/private-llms'               },
      { label: 'AI Clawbot Setup',         href: '/ai-services/clawbot-setup'              },
    ],
  },
]

const TOP_LINKS = [
  { label: 'Portfolio',          href: '/portfolio' },
  { label: 'Blog & News',       href: '/blog'      },
  { label: 'About',             href: '/about'     },
  { label: 'Service Locations', href: '/locations'  },
]

type Props = {
  onClose: () => void
}

export function MobileMenu({ onClose }: Props) {
  return (
    <div className={styles.menu}>
      {SECTIONS.map((section) => (
        <div key={section.heading}>
          <div className={styles.sectionHeading}>{section.heading}</div>
          {section.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={styles.menuLink}
              style={{ paddingLeft: 28, fontSize: '0.85rem', opacity: 0.8 }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div className={styles.divider} />

      {TOP_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={styles.menuLink}
        >
          {item.label}
        </Link>
      ))}

      <div className={styles.ctaRow}>
        <Link
          href="/admin-login"
          onClick={onClose}
          className={`${headerStyles.btnOutline} ${styles.ctaFlex}`}
        >
          Client Login
        </Link>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener"
          className={`${headerStyles.btnPrimary} ${styles.ctaFlex}`}
        >
          Book a Call
        </a>
      </div>
    </div>
  )
}
