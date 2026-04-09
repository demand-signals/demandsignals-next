import { getPostBySlug } from '@/lib/blog'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return new Response('# 404 — Post Not Found\n\nNo blog post exists at this URL.\n\n**Blog Index:** [All Posts](https://demandsignals.co/feeds/blog.md)\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const detail = getDetailLevel(request)
  const postDate = new Date(post.date)
  const tagsLine = post.tags.length > 0 ? post.tags.join(', ') : 'none'

  let md: string

  if (detail === 'summary') {
    md = [
      `# ${post.title}`,
      '',
      `**Date:** ${post.date}  `,
      `**Author:** ${post.author}  `,
      `**Category:** ${post.category}  `,
      `**Tags:** ${tagsLine}`,
      '',
      `> ${post.excerpt}`,
      '',
      '---',
      '',
      `**Full post:** [${post.title}](${SITE_URL}/feeds/blog/${slug}?detail=full)  `,
      `**Read on website:** [${SITE_URL}/blog/${slug}](${SITE_URL}/blog/${slug})  `,
      `**All posts:** [Blog Index](${SITE_URL}/feeds/blog.md)`,
    ].join('\n')
  } else {
    md = [
      `# ${post.title}`,
      '',
      `**Date:** ${post.date}  `,
      `**Author:** ${post.author}  `,
      `**Read Time:** ${post.readTime}  `,
      `**Category:** ${post.category}  `,
      `**Tags:** ${tagsLine}`,
      '',
      '---',
      '',
      post.content.trim(),
      '',
      '---',
      '',
      `*Published on [Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**Read on our website:** [${SITE_URL}/blog/${slug}](${SITE_URL}/blog/${slug})  `,
      `**All posts:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**RSS Feed:** [feed.xml](${SITE_URL}/feed.xml) | **JSON Feed:** [feed.json](${SITE_URL}/feed.json)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  }

  const conditional = checkConditional(request, md, postDate)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md, postDate),
  })
}
