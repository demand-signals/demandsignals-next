import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '@/lib/blog'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
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

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://demandsignals.co/blog/${post.slug}`)}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://demandsignals.co/blog/${post.slug}`)}`

  return (
    <>
      {/* Dark hero */}
      <section
        style={{
          background: 'var(--dark, #0d0d0d)',
          color: '#fff',
          padding: '72px 24px 64px',
        }}
      >
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          {/* Tags */}
          {post.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {post.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'rgba(232, 114, 12, 0.15)',
                    color: 'var(--accent, #e8720c)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)',
              fontWeight: 800,
              lineHeight: 1.18,
              margin: '0 0 24px',
            }}
          >
            {post.title}
          </h1>

          {/* Meta */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span>
              By <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{post.author}</strong>
            </span>
            <span>{formatDate(post.date)}</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </section>

      {/* Prose body */}
      <section
        style={{
          background: '#fff',
          padding: '56px 24px 64px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
          }}
        >
          <div className="prose">
            <MDXRemote source={post.content} />
          </div>
        </div>
      </section>

      {/* Share links */}
      <section
        style={{
          background: 'var(--light, #f5f5f3)',
          padding: '40px 24px',
          borderTop: '1px solid #e8e8e8',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#444' }}>Share this article:</span>
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#000',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Share on X
          </a>
          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0a66c2',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Share on LinkedIn
          </a>
        </div>
      </section>

      {/* CTA section */}
      <section
        style={{
          background: 'var(--dark, #0d0d0d)',
          color: '#fff',
          padding: '72px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent, #e8720c)',
              marginBottom: '14px',
            }}
          >
            Ready to act on this?
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              margin: '0 0 16px',
            }}
          >
            Get a Free AI Demand Gen Audit
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.68)',
              lineHeight: 1.65,
              marginBottom: '32px',
            }}
          >
            We&apos;ll analyze your current visibility across Google, AI assistants, and local directories — and show you exactly where the gaps are.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/tools/research-reports"
              style={{
                background: 'var(--accent, #e8720c)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: '7px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Get My Free Audit
            </Link>
            <Link
              href="/blog"
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.75)',
                padding: '14px 28px',
                borderRadius: '7px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
