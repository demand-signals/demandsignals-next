import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug, CONTENT_CATEGORY_LABELS, CONTENT_CATEGORY_COLORS } from '@/lib/blog'
import { BlogInfographic } from '@/components/blog/BlogInfographic'

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
  return {
    title: `${post.title} | Demand Signals`,
    description: post.excerpt,
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

  return (
    <>
      {/* Dark hero */}
      <section style={{ background: 'var(--dark)', color: '#fff', padding: '72px 24px 64px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
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

      {/* Prose body */}
      <section style={{ background: '#fff', padding: '56px 24px 64px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
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
      <section style={{ background: 'var(--light)', padding: '40px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Share this article:</span>
          <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Share on X
          </a>
          <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0a66c2', color: '#fff', padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Share on LinkedIn
          </a>
        </div>
      </section>

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
