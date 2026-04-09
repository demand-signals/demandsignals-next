import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

/** Strip {city}, {county}, {state} template variables from FAQ text */
function cleanTemplate(text: string): string {
  return text
    .replace(/\s+in \{city\}/g, '')
    .replace(/\s+for a \{city\} business/g, ' for a business')
    .replace(/\s+for \{city\} businesses/g, ' for businesses')
    .replace(/\s+for my \{city\} business/g, ' for my business')
    .replace(/\s+from my \{city\} location/g, ' from my location')
    .replace(/\s+near \{city\}/g, '')
    .replace(/\{city\}\s+/g, '')
    .replace(/\{city\}/g, '')
    .replace(/\{county\}/g, 'the local')
    .replace(/\{state\}/g, 'California')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const service = SERVICES.find(s => s.slug === slug)

  if (!service) {
    return new Response('# 404 — Service Not Found\n\nNo service exists at this URL.\n\n**All services:** [Services Directory](https://demandsignals.co/feeds/services.md)\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const detail = getDetailLevel(request)
  const catMeta = SERVICE_CATEGORIES[service.category]

  let md: string

  if (detail === 'summary') {
    md = [
      `# ${service.name} | Demand Signals`,
      '',
      `> ${service.tagline}`,
      '',
      `**Category:** ${catMeta.label}  `,
      `**URL:** ${SITE_URL}${service.parentHref}`,
      '',
      '---',
      '',
      `**Full details:** [${service.name}](${SITE_URL}/feeds/services/${slug}?detail=full)  `,
      `**View this service:** [${service.name}](${SITE_URL}${service.parentHref})  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)`,
    ].join('\n')
  } else {
    const features = service.features.map(f => `- ${f}`).join('\n')
    const faqs = service.faqTemplates
      .map(faq => `### ${cleanTemplate(faq.question)}\n\n${cleanTemplate(faq.answer)}`)
      .join('\n\n')

    md = [
      `# ${service.name} | Demand Signals`,
      '',
      `> ${service.tagline}`,
      '',
      `**Category:** ${catMeta.label}  `,
      `**URL:** ${SITE_URL}${service.parentHref}`,
      '',
      '## Overview',
      '',
      service.description,
      '',
      "## What's Included",
      '',
      features,
      '',
      '## Frequently Asked Questions',
      '',
      faqs,
      '',
      '---',
      '',
      `**View this service:** [${service.name}](${SITE_URL}${service.parentHref})  `,
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
