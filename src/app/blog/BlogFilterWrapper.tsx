'use client'

import { useState } from 'react'
import { BlogCategoryBar } from '@/components/blog/BlogCategoryBar'
import BlogGrid from './BlogGrid'

interface Post {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  tags: string[]
  readTime: string
  category?: string
  infographic?: {
    headline: string
    stats?: Array<{ label: string; value: string }>
    type: string
  }
}

export default function BlogFilterWrapper({ posts }: { posts: Post[] }) {
  const [filter, setFilter] = useState('all')

  return (
    <>
      <BlogCategoryBar active={filter} onChange={setFilter} />
      <section id="posts" style={{ background: 'var(--light, #f5f5f3)', padding: '64px 24px 96px' }}>
        <BlogGrid posts={posts} filter={filter} />
        {filter !== 'all' && filter !== 'recent' && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                background: 'none', border: '1.5px solid var(--teal)', color: 'var(--teal)',
                padding: '10px 24px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Show All Posts →
            </button>
          </div>
        )}
      </section>
    </>
  )
}
