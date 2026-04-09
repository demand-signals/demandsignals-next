/**
 * Atom 1.0 feed — /atom.xml
 *
 * Serves the latest 50 blog posts as an Atom 1.0 feed with
 * WebSub hub link for real-time subscription.
 */

import { getAllPosts } from '@/lib/blog'
import { feedHeaders, checkConditional, escapeXml, SITE_URL } from '@/lib/feed-utils'

function toIso8601(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toISOString()
}

export async function GET(request: Request): Promise<Response> {
  const posts = getAllPosts().slice(0, 50)

  const lastModified = posts.length > 0 ? new Date(posts[0].date) : new Date()

  const entries = posts
    .map(post => {
      const link = `${SITE_URL}/blog/${post.slug}`

      return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link rel="alternate" type="text/html" href="${link}" />
    <id>${link}</id>
    <updated>${toIso8601(post.date)}</updated>
    <summary>${escapeXml(post.excerpt)}</summary>
    <author>
      <name>${escapeXml(post.author || 'Demand Signals')}</name>
    </author>${post.tags.map(tag => `
    <category term="${escapeXml(tag)}" />`).join('')}
  </entry>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Demand Signals Blog</title>
  <subtitle>AI-powered demand generation insights, search updates, and industry analysis from Demand Signals.</subtitle>
  <link rel="alternate" type="text/html" href="${SITE_URL}" />
  <link rel="self" type="application/atom+xml" href="${SITE_URL}/atom.xml" />
  <link rel="hub" href="https://pubsubhubbub.appspot.com/" />
  <id>${SITE_URL}/atom.xml</id>
  <updated>${toIso8601(lastModified.toISOString())}</updated>
  <generator>Next.js + Demand Signals</generator>
  <rights>Copyright ${new Date().getFullYear()} Demand Signals</rights>
${entries}
</feed>`

  const cached = checkConditional(request, xml, lastModified)
  if (cached) return cached

  return new Response(xml, {
    headers: feedHeaders('application/atom+xml', xml, lastModified),
  })
}
