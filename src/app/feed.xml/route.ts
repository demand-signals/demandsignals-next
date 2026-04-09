/**
 * RSS 2.0 feed — /feed.xml
 *
 * Serves the latest 50 blog posts as an RSS 2.0 feed with Atom
 * namespace extensions (self link, WebSub hub).
 */

import { getAllPosts } from '@/lib/blog'
import { feedHeaders, checkConditional, escapeXml, SITE_URL } from '@/lib/feed-utils'

function toRfc2822(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toUTCString()
}

export async function GET(request: Request): Promise<Response> {
  const posts = getAllPosts().slice(0, 50)

  const lastModified = posts.length > 0 ? new Date(posts[0].date) : new Date()

  const items = posts
    .map(post => {
      const link = `${SITE_URL}/blog/${post.slug}`
      const categories = post.tags
        .map(tag => `      <category>${escapeXml(tag)}</category>`)
        .join('\n')

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${toRfc2822(post.date)}</pubDate>
      <guid isPermaLink="true">${link}</guid>
${categories}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Demand Signals Blog</title>
    <link>${SITE_URL}</link>
    <description>AI-powered demand generation insights, search updates, and industry analysis from Demand Signals.</description>
    <language>en-us</language>
    <lastBuildDate>${toRfc2822(lastModified.toISOString())}</lastBuildDate>
    <generator>Next.js + Demand Signals</generator>
    <atom:link rel="hub" href="https://pubsubhubbub.appspot.com/" />
    <atom:link rel="self" type="application/rss+xml" href="${SITE_URL}/feed.xml" />
${items}
  </channel>
</rss>`

  const cached = checkConditional(request, xml, lastModified)
  if (cached) return cached

  return new Response(xml, {
    headers: feedHeaders('application/rss+xml', xml, lastModified),
  })
}
