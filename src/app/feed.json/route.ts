/**
 * JSON Feed 1.1 — /feed.json
 *
 * Serves the latest 50 blog posts as a JSON Feed 1.1 document.
 * Spec: https://www.jsonfeed.org/version/1.1/
 */

import { getAllPosts } from '@/lib/blog'
import { feedHeaders, checkConditional, SITE_URL } from '@/lib/feed-utils'

export async function GET(request: Request): Promise<Response> {
  const posts = getAllPosts().slice(0, 50)

  const lastModified = posts.length > 0 ? new Date(posts[0].date) : new Date()

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Demand Signals Blog',
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.json`,
    description: 'AI-powered demand generation insights, search updates, and industry analysis',
    language: 'en-US',
    authors: [
      { name: 'Demand Signals', url: SITE_URL },
    ],
    items: posts.map(post => ({
      id: `${SITE_URL}/blog/${post.slug}`,
      url: `${SITE_URL}/blog/${post.slug}`,
      title: post.title,
      summary: post.excerpt,
      date_published: new Date(post.date).toISOString(),
      authors: [{ name: post.author || 'Demand Signals' }],
      tags: post.tags,
    })),
  }

  const json = JSON.stringify(feed, null, 2)

  const cached = checkConditional(request, json, lastModified)
  if (cached) return cached

  return new Response(json, {
    headers: feedHeaders('application/feed+json', json, lastModified),
  })
}
