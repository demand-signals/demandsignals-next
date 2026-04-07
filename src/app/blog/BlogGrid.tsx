'use client'
import Link from 'next/link'

const CATEGORY_COLORS: Record<string, string> = {
  'search-updates': '#2563EB',
  'core-updates': '#DC2626',
  'ai-engineering': '#7C3AED',
  'search-central': '#059669',
  'industry-trends': '#D97706',
  'how-to': '#0891B2',
  'case-studies': '#DB2777',
}

const CATEGORY_LABELS: Record<string, string> = {
  'search-updates': 'Search Updates',
  'core-updates': 'Core Updates',
  'ai-engineering': 'AI Engineering',
  'search-central': 'Search Central',
  'industry-trends': 'Industry Trends',
  'how-to': 'How-To',
  'case-studies': 'Case Studies',
}

interface Infographic {
  headline: string
  stats?: Array<{ label: string; value: string }>
  type: string
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
  infographic?: Infographic
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function InfographicPreview({ infographic, category }: { infographic: Infographic; category?: string }) {
  const accentColor = CATEGORY_COLORS[category || ''] || '#6b7280'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1d2330 0%, #2a3448 100%)',
      borderRadius: '10px 10px 0 0',
      padding: '20px 18px 16px',
      position: 'relative',
      overflow: 'hidden',
      height: 160,
    }}>
      {/* Grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      <div style={{ position: 'relative' }}>
        {/* Brand + category */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <img src="/dsig-icon.png" alt="" width={14} height={14} style={{ borderRadius: 3 }} aria-hidden="true" />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DSIG</span>
          </div>
          {category && (
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, color: accentColor,
              background: `${accentColor}20`, padding: '2px 8px', borderRadius: 100,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {CATEGORY_LABELS[category] || category}
            </span>
          )}
        </div>
        {/* Headline */}
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 10 }}>
          {infographic.headline}
        </div>
        {/* Stats preview */}
        {infographic.stats && infographic.stats.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {infographic.stats.slice(0, 3).map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                padding: '6px 8px', flex: 1, textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: i % 2 === 0 ? '#68c5ad' : '#FF6B2B', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function BlogGrid({ posts, filter = 'all' }: { posts: Post[]; filter?: string }) {
  const filtered = filter === 'all' || filter === 'recent'
    ? posts
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
              {/* Infographic preview */}
              {post.infographic ? (
                <InfographicPreview infographic={post.infographic} category={post.category} />
              ) : (
                <div style={{
                  height: 8, background: catColor,
                  borderRadius: '10px 10px 0 0',
                }} />
              )}

              <div style={{ padding: '20px 24px 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {catLabel && !post.infographic && (
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
