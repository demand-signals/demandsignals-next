import Link from 'next/link'
import styles from './navDropdown.module.css'

type NavItem = {
  label: string
  href: string
  badge?: string
}

type Props = {
  items: NavItem[]
  hasBadge?: boolean
  columns?: 1 | 2
  onClose?: () => void
}

export function NavDropdownPanel({ items, hasBadge = false, columns = 1, onClose }: Props) {
  const panelClass = [
    styles.panel,
    columns === 2 ? styles.panelDouble : styles.panelSingle,
  ].join(' ')

  return (
    <div className={panelClass}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={styles.item} onClick={onClose}>
          <span>{item.label}</span>
          {hasBadge && item.badge && (
            <span className={[
              styles.badge,
              item.badge === 'Free' ? styles.badgeFree : styles.badgeSoon,
            ].join(' ')}>
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
