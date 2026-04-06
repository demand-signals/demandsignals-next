import { buildMetadata } from '@/lib/metadata'
import { getAllPosts } from '@/lib/blog'
import BlogFilterWrapper from './BlogFilterWrapper'
import { PageHero } from '@/components/sections/PageHero'

export const metadata = buildMetadata({
  title:       'Blog — AI, Demand Generation & Digital Strategy | Demand Signals',
  description: 'Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond.',
  path:        '/blog',
})

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <>
      <PageHero
        eyebrow="Demand Signals Blog"
        title={<><span style={{color:'#52C9A0'}}>AI, Demand Generation</span> &amp; <span style={{color:'#FF6B2B'}}>Digital Strategy</span></>}
        subtitle="Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond."
        ctaLabel="Subscribe →"
        ctaHref="#posts"
      />

      {/* Interactive filter + grid */}
      <BlogFilterWrapper posts={posts} />
    </>
  )
}
