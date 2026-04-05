import Link from 'next/link'
import styles from './navDropdown.module.css'

type NavItem = {
  icon?: string
  label: string
  desc?: string
  href: string
  badge?: string
}

type Props = {
  items: NavItem[]
  onClose?: () => void
}

export function NavDropdownPanel({ items, onClose }: Props) {
  return (
    <div className={styles.panel}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={styles.item} onClick={onClose}>
          {item.icon && (
            <span className={styles.iconWrap}>{item.icon}</span>
          )}
          <span className={styles.itemText}>
            <span className={styles.itemLabel}>
              {item.label}
              {item.badge && (
                <span className={[
                  styles.badge,
                  item.badge === 'Free' ? styles.badgeFree : styles.badgeSoon,
                ].join(' ')}>
                  {item.badge}
                </span>
              )}
            </span>
            {item.desc && (
              <span className={styles.itemDesc}>{item.desc}</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  )
}
