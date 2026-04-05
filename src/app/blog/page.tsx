import { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import BlogGrid from './BlogGrid'

export const metadata: Metadata = {
  title: 'Blog — AI, Demand Generation & Digital Strategy | Demand Signals',
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <>
      {/* Dark hero */}
      <section style={{ background: 'var(--dark, #0d0d0d)', color: '#fff', padding: '80px 24px 72px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent, #e8720c)', marginBottom: '16px' }}>
            Demand Signals Blog
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px' }}>
            AI, Demand Generation &amp; Digital Strategy
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.72)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
            Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond.
          </p>
        </div>
      </section>

      {/* Post grid */}
      <section style={{ background: 'var(--light, #f5f5f3)', padding: '64px 24px 96px' }}>
        <BlogGrid posts={posts} />
      </section>
    </>
  )
}
