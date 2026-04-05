'use client'
import Link from 'next/link'

interface Post {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  tags: string[]
  readTime: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogGrid({ posts }: { posts: Post[] }) {
  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '28px',
      }}
    >
      {posts.map(post => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
        >
          <article
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '28px 28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              transition: 'box-shadow 0.18s ease, transform 0.18s ease',
              width: '100%',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.11)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
            }}
          >
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {post.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                      textTransform: 'uppercase', background: 'rgba(232, 114, 12, 0.1)',
                      color: 'var(--accent, #e8720c)', padding: '3px 8px', borderRadius: '4px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3, margin: 0, color: 'var(--dark, #0d0d0d)' }}>
              {post.title}
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#555', lineHeight: 1.6, margin: 0, flexGrow: 1 }}>
              {post.excerpt}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888', paddingTop: '8px', borderTop: '1px solid #f0f0f0', marginTop: 'auto' }}>
              <span>{post.author.split(' ')[0]}</span>
              <span>{formatDate(post.date)}</span>
              <span>{post.readTime}</span>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}
