import Link from 'next/link'
import { getAllPosts, getPostsByServiceCategory, CONTENT_CATEGORY_LABELS, CONTENT_CATEGORY_COLORS, type ServiceCategory, type PostMeta } from '@/lib/blog'

function PostCard({ post }: { post: PostMeta }) {
  const catColor = CONTENT_CATEGORY_COLORS[post.category] || '#6b7280'
  const catLabel = CONTENT_CATEGORY_LABELS[post.category] || post.category

  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{
        background: '#fff',
        border: '1px solid #edf0f4',
        borderRadius: 12,
        padding: '20px 18px',
        minWidth: 300,
        maxWidth: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        textDecoration: 'none',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
    >
      {/* Category pill */}
      <span style={{
        display: 'inline-block', width: 'fit-content',
        background: `${catColor}15`, color: catColor,
        padding: '3px 10px', borderRadius: 100,
        fontSize: '0.68rem', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {catLabel}
      </span>
      {/* Title */}
      <h4 style={{
        color: 'var(--dark)', fontWeight: 700, fontSize: '0.9rem',
        lineHeight: 1.4, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {post.title}
      </h4>
      {/* Meta */}
      <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--slate)', marginTop: 'auto' }}>
        <span>{post.author.split(' ')[0]}</span>
        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span>{post.readTime}</span>
      </div>
    </Link>
  )
}

export function BlogPostMarquee({ serviceCategory, limit = 8 }: { serviceCategory?: ServiceCategory; limit?: number }) {
  const posts = serviceCategory
    ? getPostsByServiceCategory(serviceCategory).slice(0, limit)
    : getAllPosts().slice(0, limit)

  if (posts.length === 0) return null

  return (
    <section style={{ background: 'var(--light)', padding: '48px 0', overflow: 'hidden', borderTop: '1px solid #edf0f4' }}>
      <div style={{ padding: '0 24px', marginBottom: 20 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Latest from the Blog
            </span>
          </div>
          <Link href="/blog" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
            View all posts →
          </Link>
        </div>
      </div>

      <style>{`
        .blog-marquee-row { display: flex; gap: 16; width: max-content; animation: blogMarquee 40s linear infinite; }
        .blog-marquee-row:hover { animation-play-state: paused; }
        @keyframes blogMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      <div className="blog-marquee-row">
        {[...posts, ...posts].map((post, i) => (
          <PostCard key={`${post.slug}-${i}`} post={post} />
        ))}
      </div>
    </section>
  )
}
