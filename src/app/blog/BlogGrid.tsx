'use client'
import Link from 'next/link'

const CATEGORY_COLORS: Record<string, string> = {
  'search-updates': '#2563EB',
  'core-updates': '#DC2626',
  'ai-engineering': '#7C3AED',
  'ai-changelog': '#F59E0B',
  'search-central': '#059669',
  'industry-trends': '#D97706',
  'how-to': '#0891B2',
  'case-studies': '#DB2777',
}

const CATEGORY_LABELS: Record<string, string> = {
  'search-updates': 'Search Updates',
  'core-updates': 'Core Updates',
  'ai-engineering': 'AI Engineering',
  'ai-changelog': 'The AI ChangeLog',
  'search-central': 'Search Central',
  'industry-trends': 'Industry Trends',
  'how-to': 'How-To',
  'case-studies': 'Case Studies',
}

interface Post {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  tags: string[]
  readTime: string
  category?: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogGrid({ posts, filter = 'all' }: { posts: Post[]; filter?: string }) {
  const filtered = filter === 'all' || filter === 'recent'
    ? posts.filter(p => p.category !== 'ai-changelog') // Exclude changelog from "all" — it has its own filter
    : posts.filter(p => p.category === filter)

  const sorted = filter === 'recent'
    ? [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 12)
    : filtered
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '28px',
      }}
    >
      {sorted.map(post => {
        const catColor = CATEGORY_COLORS[post.category || ''] || '#6b7280'
        const catLabel = CATEGORY_LABELS[post.category || ''] || ''

        return (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
          >
            <article
              className="blog-card"
              style={{
                background: '#fff',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                transition: 'box-shadow 0.18s ease, transform 0.18s ease',
                width: '100%',
                overflow: 'hidden',
              }}
            >
              {/* Color-coded category bar — consistent across all cards */}
              <div style={{
                height: 8, background: catColor,
                borderRadius: '10px 10px 0 0',
              }} />

              <div style={{ padding: '20px 24px 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {catLabel && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', background: `${catColor}18`,
                      color: catColor, padding: '3px 9px', borderRadius: 100,
                    }}>
                      {catLabel}
                    </span>
                  )}
                  {post.tags.slice(0, 2).map(tag => (
                    <span key={tag} style={{
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em',
                      textTransform: 'uppercase', background: '#f1f5f9',
                      color: '#475569', padding: '3px 9px', borderRadius: 100,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3, margin: 0, color: 'var(--dark, #0d0d0d)' }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: 1.55, margin: 0, flexGrow: 1,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {post.excerpt}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#888', paddingTop: '8px', borderTop: '1px solid #f0f0f0', marginTop: 'auto' }}>
                  <span>{post.author}</span>
                  <span>{formatDate(post.date)}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </article>
          </Link>
        )
      })}

      <style>{`
        .blog-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important; transform: translateY(-3px); }
      `}</style>
    </div>
  )
}
