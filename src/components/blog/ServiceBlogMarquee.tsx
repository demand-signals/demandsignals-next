import Link from 'next/link'
import { getPostsByServiceCategory, getAllPosts, CONTENT_CATEGORY_LABELS, CONTENT_CATEGORY_COLORS, type ServiceCategory, type PostMeta } from '@/lib/blog'

const CATEGORIES = Object.entries(CONTENT_CATEGORY_LABELS) as [keyof typeof CONTENT_CATEGORY_COLORS, string][]

function PostCard({ post }: { post: PostMeta }) {
  const catColor = CONTENT_CATEGORY_COLORS[post.category] || '#6b7280'
  const catLabel = CONTENT_CATEGORY_LABELS[post.category] || post.category

  return (
    <Link href={`/blog/${post.slug}`} style={{
      background: '#fff', border: '1px solid #edf0f4', borderRadius: 12,
      padding: '18px 16px', minWidth: 300, maxWidth: 300, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none',
    }}>
      <span style={{
        display: 'inline-block', width: 'fit-content',
        background: `${catColor}15`, color: catColor,
        padding: '3px 10px', borderRadius: 100,
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {catLabel}
      </span>
      <h4 style={{
        color: 'var(--dark)', fontWeight: 700, fontSize: '0.88rem',
        lineHeight: 1.35, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {post.title}
      </h4>
      <div style={{ display: 'flex', gap: 10, fontSize: '0.68rem', color: '#9ca3af', marginTop: 'auto' }}>
        <span>{post.author}</span>
        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{post.readTime}</span>
      </div>
    </Link>
  )
}

export function ServiceBlogMarquee({ serviceCategory }: { serviceCategory: ServiceCategory }) {
  const servicePosts = getPostsByServiceCategory(serviceCategory).slice(0, 10)
  const posts = servicePosts.length > 3 ? servicePosts : getAllPosts().slice(0, 10)
  if (posts.length === 0) return null

  const latest = posts[0]
  const latestColor = CONTENT_CATEGORY_COLORS[latest.category] || '#6b7280'
  const latestLabel = CONTENT_CATEGORY_LABELS[latest.category] || ''

  return (
    <section style={{ background: 'var(--light)', padding: '64px 0', overflow: 'hidden' }}>
      <div style={{ padding: '0 24px', marginBottom: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              From the Blog
            </span>
            <Link href="/blog" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
              View all posts →
            </Link>
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {CATEGORIES.map(([key, label]) => (
              <Link key={key} href={`/blog#posts`} style={{
                padding: '4px 12px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700,
                background: `${CONTENT_CATEGORY_COLORS[key]}10`, color: CONTENT_CATEGORY_COLORS[key],
                textDecoration: 'none', letterSpacing: '0.04em',
              }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Featured latest post */}
          <Link href={`/blog/${latest.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1d2330 0%, #2a3a4a 100%)',
              borderRadius: 16, padding: '28px 32px', display: 'flex', gap: 24, alignItems: 'center',
              marginBottom: 20,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ background: `${latestColor}25`, color: latestColor, padding: '3px 10px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {latestLabel}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                    {new Date(latest.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.3, margin: '0 0 8px' }}>
                  {latest.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {latest.excerpt}
                </p>
              </div>
              <span style={{ color: 'var(--teal)', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>Read →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Scrolling marquee */}
      <style>{`
        .svc-blog-marquee { display: flex; gap: 16px; width: max-content; animation: svcBlogScroll 50s linear infinite; }
        .svc-blog-marquee:hover { animation-play-state: paused; }
        @keyframes svcBlogScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
      <div className="svc-blog-marquee">
        {[...posts.slice(1), ...posts.slice(1)].map((post, i) => (
          <PostCard key={`${post.slug}-${i}`} post={post} />
        ))}
      </div>
    </section>
  )
}
