import { getAllPosts, CONTENT_CATEGORY_LABELS, type ContentCategory } from '@/lib/blog'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

export async function GET(request: Request) {
  const detail = getDetailLevel(request)
  const posts = getAllPosts()

  // Group posts by category
  const grouped = new Map<ContentCategory, typeof posts>()
  for (const post of posts) {
    const existing = grouped.get(post.category) ?? []
    existing.push(post)
    grouped.set(post.category, existing)
  }

  // Determine newest post date for Last-Modified
  const newestDate = posts.length > 0 ? new Date(posts[0].date) : new Date()

  const categoryBlocks = Array.from(grouped.entries()).map(([cat, catPosts]) => {
    const label = CONTENT_CATEGORY_LABELS[cat] ?? cat
    const entries = catPosts.map(p => {
      if (detail === 'summary') {
        return [
          `- **[${p.title}](${SITE_URL}/blog/${p.slug})** \u2014 ${p.date}`,
          `  [Markdown](${SITE_URL}/feeds/blog/${p.slug})`,
        ].join('\n')
      }
      const tags = p.tags.length > 0 ? p.tags.join(', ') : 'none'
      return [
        `### ${p.title}`,
        '',
        `**Date:** ${p.date} | **Read Time:** ${p.readTime} | **Tags:** ${tags}`,
        '',
        `> ${p.excerpt}`,
        '',
        `**Read:** [${p.title}](${SITE_URL}/blog/${p.slug}) | [Markdown](${SITE_URL}/feeds/blog/${p.slug})`,
      ].join('\n')
    }).join(detail === 'summary' ? '\n' : '\n\n')

    return `## ${label} (${catPosts.length} posts)\n\n${entries}`
  }).join('\n\n---\n\n')

  const md = [
    '# Demand Signals \u2014 Blog & News Index',
    '',
    `> ${posts.length} posts across ${grouped.size} categories, sorted by date within each category.`,
    '',
    '**Table of Contents**',
    '',
    ...Array.from(grouped.entries()).map(([cat, catPosts]) => {
      const label = CONTENT_CATEGORY_LABELS[cat] ?? cat
      return `- [${label}](#${cat}) (${catPosts.length} posts)`
    }),
    '',
    '---',
    '',
    categoryBlocks,
    '',
    '---',
    '',
    `**RSS Feed:** [feed.xml](${SITE_URL}/feed.xml)  `,
    `**JSON Feed:** [feed.json](${SITE_URL}/feed.json)  `,
    `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
    `**About:** [About Demand Signals](${SITE_URL}/feeds/about)  `,
    `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
  ].join('\n')

  const conditional = checkConditional(request, md, newestDate)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md, newestDate),
  })
}
