import Link from 'next/link'
// Category data duplicated here to avoid importing blog.ts (uses fs)
const CONTENT_CATEGORY_LABELS = {
  'search-updates': 'Search Updates',
  'core-updates': 'Core Updates',
  'ai-engineering': 'AI Engineering',
  'search-central': 'Search Central',
  'industry-trends': 'Industry Trends',
  'how-to': 'How-To',
  'case-studies': 'Case Studies',
} as const

const CONTENT_CATEGORY_COLORS: Record<string, string> = {
  'search-updates': '#2563EB',
  'core-updates': '#DC2626',
  'ai-engineering': '#7C3AED',
  'search-central': '#059669',
  'industry-trends': '#D97706',
  'how-to': '#0891B2',
  'case-studies': '#DB2777',
}

type ContentCategory = keyof typeof CONTENT_CATEGORY_LABELS

const categories = Object.entries(CONTENT_CATEGORY_LABELS) as [ContentCategory, string][]

export function BlogCategoryNav({ activeCategory }: { activeCategory?: string }) {
  return (
    <div style={{
      background: 'var(--dark-2)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '16px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/blog" style={{
          padding: '6px 16px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700,
          background: !activeCategory ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
          color: !activeCategory ? '#fff' : 'rgba(255,255,255,0.5)',
          border: !activeCategory ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
          textDecoration: 'none',
        }}>
          Most Recent
        </Link>
        {categories.map(([key, label]) => {
          const color = CONTENT_CATEGORY_COLORS[key]
          const isActive = activeCategory === key
          return (
            <Link key={key} href={`/blog?cat=${key}#posts`} style={{
              padding: '6px 16px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700,
              background: isActive ? `${color}30` : `${color}12`,
              color: isActive ? color : `${color}99`,
              border: isActive ? `1px solid ${color}60` : '1px solid transparent',
              textDecoration: 'none', letterSpacing: '0.03em',
            }}>
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
