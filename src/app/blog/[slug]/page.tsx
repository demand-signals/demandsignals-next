import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug, getPostsByContentCategory, CONTENT_CATEGORY_LABELS, CONTENT_CATEGORY_COLORS } from '@/lib/blog'
import { BlogInfographic } from '@/components/blog/BlogInfographic'
import { ParticleCanvas } from '@/components/sections/HeroCanvas'
import { BlogCategoryNav } from '@/components/blog/BlogCategoryNav'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  const url = `https://demandsignals.co/blog/${slug}`
  return {
    title: `${post.title} | Demand Signals`,
    description: post.excerpt,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: ['/og-image.png'],
      site: '@demandsignals',
      creator: '@demandsignals',
    },
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://demandsignals.co/blog/${post.slug}`)}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://demandsignals.co/blog/${post.slug}`)}`

  const canonicalUrl = `https://demandsignals.co/blog/${post.slug}`

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: canonicalUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Demand Signals',
      logo: {
        '@type': 'ImageObject',
        url: 'https://demandsignals.co/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    image: '/og-image.png',
    keywords: post.tags.join(', '),
  }

  return (
    <>
      <JsonLd data={blogPostingSchema} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Blog', url: 'https://demandsignals.co/blog' },
        { name: post.title, url: canonicalUrl },
      ])} />

      {/* Hero with particles */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#080e1f', color: '#fff', padding: '100px 24px 64px' }}>
        <ParticleCanvas />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {post.category && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                background: `${CONTENT_CATEGORY_COLORS[post.category] || '#6b7280'}25`,
                color: CONTENT_CATEGORY_COLORS[post.category] || '#6b7280',
                padding: '4px 12px', borderRadius: 100,
              }}>
                {CONTENT_CATEGORY_LABELS[post.category] || post.category}
              </span>
            )}
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                padding: '4px 12px', borderRadius: 100,
              }}>
                {tag}
              </span>
            ))}
          </div>

          <h1 style={{ fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)', fontWeight: 800, lineHeight: 1.18, margin: '0 0 24px' }}>
            {post.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            <span>By <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{post.author}</strong></span>
            <span>{formatDate(post.date)}</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <BlogCategoryNav activeCategory={post.category} />

      {/* Prose body */}
      <section style={{ background: '#fff', padding: '56px 24px 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Infographic */}
          {post.infographic && (
            <BlogInfographic data={post.infographic} title={post.title} />
          )}
          <div className="prose">
            <MDXRemote source={post.content} />
          </div>
        </div>
      </section>

      {/* Share links */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 32px', display: 'flex', gap: 20, fontSize: '0.82rem' }}>
        <span style={{ color: 'var(--slate)' }}>Share:</span>
        <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>X / Twitter</a>
        <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>LinkedIn</a>
      </div>

      {/* Related posts in same category */}
      {post.category && (() => {
        const related = getPostsByContentCategory(post.category)
          .filter(p => p.slug !== post.slug)
          .slice(0, 8)
        if (related.length === 0) return null
        const catColor = CONTENT_CATEGORY_COLORS[post.category] || '#6b7280'
        const catLabel = CONTENT_CATEGORY_LABELS[post.category] || post.category
        return (
          <section style={{ background: 'var(--light)', padding: '48px 0', overflow: 'hidden', borderTop: '1px solid #edf0f4' }}>
            <div style={{ padding: '0 24px', marginBottom: 20 }}>
              <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: catColor }}>
                    More in {catLabel}
                  </span>
                </div>
                <Link href="/blog" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
                  View all posts →
                </Link>
              </div>
            </div>
            <style>{`
              .related-marquee { display: flex; gap: 16px; width: max-content; animation: relatedScroll 50s linear infinite; }
              .related-marquee:hover { animation-play-state: paused; }
              @keyframes relatedScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            `}</style>
            <div className="related-marquee">
              {[...related, ...related].map((p, i) => (
                <Link key={`${p.slug}-${i}`} href={`/blog/${p.slug}`} style={{
                  background: '#fff', border: '1px solid #edf0f4', borderRadius: 12,
                  padding: '20px 18px', minWidth: 300, maxWidth: 300, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none',
                }}>
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
                    color: 'var(--dark)', fontWeight: 700, fontSize: '0.9rem',
                    lineHeight: 1.4, margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {p.title}
                  </h4>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--slate)', marginTop: 'auto' }}>
                    <span>{p.author}</span>
                    <span>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })()}

      {/* CTA */}
      <section style={{ background: '#FF6B2B', color: '#fff', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px' }}>
            Get a Free AI Demand Gen Audit
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 32 }}>
            We&apos;ll analyze your current visibility across Google, AI assistants, and local directories — and show you exactly where the gaps are.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/tools/research-reports" style={{ background: 'var(--dark)', color: '#fff', padding: '14px 28px', borderRadius: 100, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              Get My Free Audit
            </Link>
            <Link href="/blog" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '14px 28px', borderRadius: 100, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.6)' }}>
              Back to Blog
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
