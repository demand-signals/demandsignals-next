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
      <style>{`@media(min-width:768px){.blog-featured-content{padding:48px 56px !important}}`}</style>
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

      {/* Featured latest post — single column, full-bleed dark card */}
      {posts[0] && (() => {
        const latest = posts[0]
        const latestColor = CATEGORIES.find(c => c.key === latest.category)?.color || '#6b7280'
        const latestLabel = CATEGORIES.find(c => c.key === latest.category)?.label || ''
        return (
          <div style={{ padding: '0 24px', marginBottom: 32 }}>
            <Link href={`/blog/${latest.slug}`} style={{ textDecoration: 'none', display: 'block', maxWidth: 1200, margin: '0 auto' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1d2330 0%, #2a3448 100%)',
                borderRadius: 20, overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Subtle grid pattern */}
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.025,
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                  pointerEvents: 'none',
                }} />
                <div className="blog-featured-content" style={{
                  position: 'relative',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                    <span style={{
                      marginLeft: 'auto',
                      color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 600,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      Latest Post
                    </span>
                  </div>
                  <h3 style={{
                    color: '#fff',
                    fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                    fontWeight: 800, lineHeight: 1.25, margin: 0,
                    maxWidth: 880,
                  }}>
                    {latest.title}
                  </h3>
                  <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '1rem', lineHeight: 1.65, margin: 0,
                    maxWidth: 760,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {latest.excerpt}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span style={{ color: 'var(--teal)', fontSize: '0.9rem', fontWeight: 600 }}>Read article →</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>{latest.readTime}</span>
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

      {/* Static 3×2 post grid (skips featured post index 0) */}
      <style>{`
        .home-blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .home-blog-card {
          background: #fff;
          border: 1px solid #edf0f4;
          border-radius: 12;
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-decoration: none;
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
        }
        .home-blog-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(16, 24, 40, 0.08);
          border-color: rgba(104, 197, 173, 0.3);
        }
        @media (max-width: 900px) {
          .home-blog-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .home-blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="home-blog-grid">
        {posts.slice(1, 7).map(post => {
          const catColor = CATEGORIES.find(c => c.key === post.category)?.color || '#6b7280'
          const catLabel = CATEGORIES.find(c => c.key === post.category)?.label || ''
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="home-blog-card"
              style={{ borderRadius: 12 }}
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
                color: 'var(--dark)', fontWeight: 700, fontSize: '0.98rem',
                lineHeight: 1.4, margin: 0,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {post.title}
              </h4>
              <p style={{
                color: 'var(--slate)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0, flex: 1,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {post.excerpt}
              </p>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: '#9ca3af', marginTop: 6, alignItems: 'center' }}>
                <span>{post.author}</span>
                <span aria-hidden="true">·</span>
                <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span aria-hidden="true">·</span>
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
            .home-changelog-feed {
              max-width: 880px;
              margin: 0 auto;
              padding: 0 24px;
              display: flex;
              flex-direction: column;
              gap: 2px;
              position: relative;
            }
            .home-changelog-entry {
              display: grid;
              grid-template-columns: 120px 1fr auto;
              align-items: flex-start;
              gap: 20px;
              padding: 18px 20px;
              background: transparent;
              border-radius: 10px;
              text-decoration: none;
              position: relative;
              border-bottom: 1px solid #f1ecd9;
              transition: background 0.15s;
            }
            .home-changelog-entry:hover {
              background: #fffbeb;
            }
            .home-changelog-entry:last-child { border-bottom: none; }
            .home-changelog-date {
              font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
              font-size: 0.75rem;
              color: #D97706;
              font-weight: 700;
              letter-spacing: 0.04em;
              padding-top: 3px;
              text-transform: uppercase;
              white-space: nowrap;
            }
            .home-changelog-title {
              color: var(--dark);
              font-weight: 600;
              font-size: 0.95rem;
              line-height: 1.45;
              margin: 0 0 4px;
            }
            .home-changelog-excerpt {
              color: var(--slate);
              font-size: 0.82rem;
              line-height: 1.5;
              margin: 0;
              display: -webkit-box;
              -webkit-line-clamp: 1;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .home-changelog-read {
              color: #D97706;
              font-size: 0.78rem;
              font-weight: 600;
              padding-top: 3px;
              white-space: nowrap;
              opacity: 0.6;
              transition: opacity 0.15s, transform 0.15s;
            }
            .home-changelog-entry:hover .home-changelog-read {
              opacity: 1;
              transform: translateX(3px);
            }
            @media (max-width: 640px) {
              .home-changelog-entry {
                grid-template-columns: 1fr;
                gap: 6px;
              }
              .home-changelog-read { display: none; }
            }
          `}</style>

          <div className="home-changelog-feed">
            {changelogPosts.slice(0, 6).map(post => (
              <Link
                key={`cl-${post.slug}`}
                href={`/blog/${post.slug}`}
                className="home-changelog-entry"
              >
                <span className="home-changelog-date">
                  {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div>
                  <h4 className="home-changelog-title">{post.title}</h4>
                  <p className="home-changelog-excerpt">{post.excerpt}</p>
                </div>
                <span className="home-changelog-read">Read →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
