import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

const CATEGORIES = [
  { key: 'search-updates', label: 'Search Updates', color: '#2563EB' },
  { key: 'core-updates', label: 'Core Updates', color: '#DC2626' },
  { key: 'ai-engineering', label: 'AI Engineering', color: '#7C3AED' },
  { key: 'search-central', label: 'Search Central', color: '#059669' },
  { key: 'industry-trends', label: 'Industry Trends', color: '#D97706' },
  { key: 'how-to', label: 'How-To', color: '#0891B2' },
  { key: 'case-studies', label: 'Case Studies', color: '#DB2777' },
]

export default function HomeBlogSection() {
  const allPosts = getAllPosts()
  const posts = allPosts.filter(p => p.category !== 'ai-changelog').slice(0, 12)
  const changelogPosts = allPosts.filter(p => p.category === 'ai-changelog').slice(0, 20)
  if (posts.length === 0) return null

  return (
    <section style={{ background: 'var(--light)', padding: '80px 0 64px', overflow: 'hidden' }}>
      {/* Header */}
      <style>{`@media(min-width:768px){.blog-featured-grid{grid-template-columns:1fr 1fr !important;min-height:280px !important}.blog-featured-content{padding:36px 40px !important}.blog-featured-info{padding:36px 32px !important;border-top:none !important;border-left:1px solid rgba(255,255,255,0.06) !important}}`}</style>
      <div style={{ padding: '0 24px', marginBottom: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)',
            padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            From the Blog
          </span>
          <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 12px' }}>
            Insights That Move the Needle.
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 24px' }}>
            Real-time analysis of Google updates, AI model releases, and the strategies that actually work for local businesses.
          </p>
        </div>
      </div>

      {/* Featured latest post */}
      {posts[0] && (() => {
        const latest = posts[0]
        const latestColor = CATEGORIES.find(c => c.key === latest.category)?.color || '#6b7280'
        const latestLabel = CATEGORIES.find(c => c.key === latest.category)?.label || ''
        const latestStats = (latest as Record<string, unknown>).infographic as { headline?: string; stats?: Array<{ label: string; value: string }> } | undefined
        return (
          <div style={{ padding: '0 24px', marginBottom: 32 }}>
            <Link href={`/blog/${latest.slug}`} style={{ textDecoration: 'none', display: 'block', maxWidth: 1200, margin: '0 auto' }}>
              <div className="blog-featured-grid" style={{
                background: 'linear-gradient(135deg, #1d2330 0%, #2a3448 100%)',
                borderRadius: 20, overflow: 'hidden',
                display: 'grid', gridTemplateColumns: '1fr', minHeight: 0,
              }}>
                {/* Left — content */}
                <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }} className="blog-featured-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: `${latestColor}25`, color: latestColor,
                      padding: '4px 12px', borderRadius: 100, fontSize: '0.7rem',
                      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {latestLabel}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {new Date(latest.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 800, lineHeight: 1.3, margin: 0 }}>
                    {latest.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {latest.excerpt}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span style={{ color: 'var(--teal)', fontSize: '0.85rem', fontWeight: 600 }}>Read article →</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{latest.readTime}</span>
                  </div>
                </div>
                {/* Right — infographic preview */}
                <div className="blog-featured-info" style={{
                  position: 'relative', padding: '20px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, opacity: 0.03,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                      <img src="/dsig-icon.png" alt="" width={16} height={16} style={{ borderRadius: 3 }} aria-hidden="true" />
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Latest Post</span>
                    </div>
                    {latestStats?.headline && (
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
                        {latestStats.headline}
                      </div>
                    )}
                    {latestStats?.stats && latestStats.stats.length > 0 && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {latestStats.stats.slice(0, 4).map((stat, i) => (
                          <div key={i} style={{
                            background: 'rgba(255,255,255,0.06)', borderRadius: 8,
                            padding: '12px 10px', flex: '1 1 60px', minWidth: 60, textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: i % 2 === 0 ? '#68c5ad' : '#FF6B2B', lineHeight: 1 }}>
                              {stat.value}
                            </div>
                            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )
      })()}

      {/* Category pills */}
      <div style={{ padding: '0 24px', marginBottom: 28 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              href={`/blog#posts`}
              style={{
                padding: '5px 14px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 700,
                background: `${cat.color}12`, color: cat.color,
                textDecoration: 'none', letterSpacing: '0.04em',
                transition: 'background 0.15s',
              }}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Scrolling posts */}
      <style>{`
        .home-blog-marquee { display: flex; gap: 16px; width: max-content; animation: homeBlogScroll 60s linear infinite; }
        .home-blog-marquee:hover { animation-play-state: paused; }
        @keyframes homeBlogScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      <div className="home-blog-marquee">
        {[...posts, ...posts].map((post, i) => {
          const catColor = CATEGORIES.find(c => c.key === post.category)?.color || '#6b7280'
          const catLabel = CATEGORIES.find(c => c.key === post.category)?.label || ''
          return (
            <Link
              key={`${post.slug}-${i}`}
              href={`/blog/${post.slug}`}
              style={{
                background: '#fff', border: '1px solid #edf0f4', borderRadius: 12,
                padding: '20px 18px', minWidth: 320, maxWidth: 320, flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none',
                transition: 'box-shadow 0.2s',
              }}
            >
              <span style={{
                display: 'inline-block', width: 'fit-content',
                background: `${catColor}15`, color: catColor,
                padding: '3px 10px', borderRadius: 100,
                fontSize: '0.68rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {catLabel}
              </span>
              <h4 style={{
                color: 'var(--dark)', fontWeight: 700, fontSize: '0.92rem',
                lineHeight: 1.4, margin: 0,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {post.title}
              </h4>
              <p style={{
                color: 'var(--slate)', fontSize: '0.82rem', lineHeight: 1.5, margin: 0,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {post.excerpt}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#9ca3af', marginTop: 'auto' }}>
                <span>{post.author}</span>
                <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* View all link */}
      <div style={{ textAlign: 'center', marginTop: 28, padding: '0 24px' }}>
        <Link href="/blog" style={{
          color: 'var(--teal)', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
          borderBottom: '2px solid var(--teal)', paddingBottom: 2,
        }}>
          View All {posts.length < 12 ? posts.length : '140+' } Posts →
        </Link>
      </div>

      {/* The AI ChangeLog — separate marquee */}
      {changelogPosts.length > 0 && (
        <div style={{ marginTop: 48, borderTop: '1px solid #e2e6ec', paddingTop: 32 }}>
          <div style={{ padding: '0 24px', marginBottom: 20 }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-block', background: '#F59E0B18', color: '#F59E0B',
                  padding: '5px 14px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Daily
                </span>
                <h3 style={{ color: 'var(--dark)', fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  The AI ChangeLog
                </h3>
                <span style={{ color: 'var(--slate)', fontSize: '0.82rem' }}>
                  — What changed across OpenAI, Anthropic, Gemini &amp; DeepSeek
                </span>
              </div>
              <Link href="/blog" style={{
                color: '#F59E0B', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none',
              }}>
                View all changelogs →
              </Link>
            </div>
          </div>

          <style>{`
            .home-changelog-marquee { display: flex; gap: 14px; width: max-content; animation: changelogScroll 40s linear infinite; }
            .home-changelog-marquee:hover { animation-play-state: paused; }
            @keyframes changelogScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          `}</style>

          <div className="home-changelog-marquee">
            {[...changelogPosts, ...changelogPosts].map((post, i) => (
              <Link
                key={`cl-${post.slug}-${i}`}
                href={`/blog/${post.slug}`}
                style={{
                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                  padding: '14px 16px', minWidth: 280, maxWidth: 280, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#F59E0B20', color: '#D97706',
                    padding: '2px 8px', borderRadius: 100,
                    fontSize: '0.62rem', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    ChangeLog
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h4 style={{
                  color: 'var(--dark)', fontWeight: 700, fontSize: '0.85rem',
                  lineHeight: 1.35, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {post.title}
                </h4>
                <p style={{
                  color: 'var(--slate)', fontSize: '0.76rem', lineHeight: 1.45, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
