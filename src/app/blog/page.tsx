import { buildMetadata } from '@/lib/metadata'
import { getAllPosts } from '@/lib/blog'
import BlogFilterWrapper from './BlogFilterWrapper'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'Blog — AI, Demand Generation & Digital Strategy | Demand Signals',
  description: 'Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond.',
  path:        '/blog',
})

export default function BlogIndexPage() {
  const posts = getAllPosts()

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Demand Signals Blog',
    description: 'Practical insights from the agents and humans running demand generation for local businesses across Northern California and beyond.',
    url: 'https://demandsignals.co/blog',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://demandsignals.co/blog/${post.slug}`,
        name: post.title,
      })),
    },
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Blog', url: 'https://demandsignals.co/blog' },
      ])} />
      <JsonLd data={collectionSchema} />
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
