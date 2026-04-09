import { getCategoryBySlug } from '@/lib/category-content'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

/** Derive the per-service markdown slug from a service href like /websites-apps/wordpress-development */
function serviceSlugFromHref(href: string): string {
  const parts = href.split('/')
  return parts[parts.length - 1]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!category) {
    return new Response('# 404 — Category Not Found\n\nNo category exists at this URL.\n\n**All services:** [Services Directory](https://demandsignals.co/feeds/services.md)\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    const servicesList = category.services
      .map(s => `- [${s.title}](${SITE_URL}${s.href})`)
      .join('\n')

    md = [
      `# ${category.name} | Demand Signals`,
      '',
      `> ${category.description}`,
      '',
      `**URL:** ${SITE_URL}/${slug}`,
      '',
      '## Services',
      '',
      servicesList,
      '',
      '---',
      '',
      `**Full details:** [${category.name}](${SITE_URL}/feeds/categories/${slug}?detail=full)  `,
      `**View this category:** [${category.name}](${SITE_URL}/${slug})  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)`,
    ].join('\n')
  } else {
    const servicesBlock = category.services.map(s => {
      const svcSlug = serviceSlugFromHref(s.href)
      return [
        `### ${s.title}`,
        s.description,
        '',
        `**Features:** ${s.features.join(', ')}  `,
        `**Learn more:** [${s.title}](${SITE_URL}${s.href}) | [Markdown](${SITE_URL}/feeds/services/${svcSlug})`,
      ].join('\n')
    }).join('\n\n')

    const faqsBlock = category.faqs
      .map(faq => `### ${faq.question}\n\n${faq.answer}`)
      .join('\n\n')

    md = [
      `# ${category.name} | Demand Signals`,
      '',
      `> ${category.description}`,
      '',
      category.callout,
      '',
      `**URL:** ${SITE_URL}/${slug}`,
      '',
      '## Services',
      '',
      servicesBlock,
      '',
      '## Frequently Asked Questions',
      '',
      faqsBlock,
      '',
      '---',
      '',
      `**View this category:** [${category.name}](${SITE_URL}/${slug})  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**Master FAQ:** [All FAQs](${SITE_URL}/faqs.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  }

  const conditional = checkConditional(request, md)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
