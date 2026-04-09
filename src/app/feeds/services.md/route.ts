import { SERVICES, SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/services'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const CATEGORY_ORDER: ServiceCategory[] = ['websites-apps', 'demand-generation', 'content-social', 'ai-services']

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  const sections = CATEGORY_ORDER.map(catKey => {
    const catMeta = SERVICE_CATEGORIES[catKey]
    const services = SERVICES.filter(s => s.category === catKey)

    const serviceEntries = services.map(s => {
      if (detail === 'summary') {
        return [
          `### ${s.name}`,
          '',
          `> ${s.tagline}`,
          '',
          `**View:** [${s.name}](${SITE_URL}${s.parentHref}) | [Markdown](${SITE_URL}/feeds/services/${s.slug})`,
        ].join('\n')
      }
      const features = s.features.map(f => `- ${f}`).join('\n')
      return [
        `### ${s.name}`,
        '',
        `> ${s.tagline}`,
        '',
        s.description,
        '',
        '**Included:**',
        features,
        '',
        `**View:** [${s.name}](${SITE_URL}${s.parentHref}) | [Markdown](${SITE_URL}/feeds/services/${s.slug})`,
      ].join('\n')
    }).join('\n\n')

    return [
      `## ${catMeta.label}`,
      '',
      `**Category page:** [${catMeta.label}](${SITE_URL}/${catKey}) | [Markdown](${SITE_URL}/feeds/categories/${catKey})`,
      '',
      serviceEntries,
    ].join('\n')
  }).join('\n\n---\n\n')

  const totalServices = SERVICES.length
  const md = [
    '# Demand Signals \u2014 Services Directory',
    '',
    `> ${totalServices} AI-powered services across 4 categories. Each service page includes detailed features, technology stack, FAQ, and pricing guidance.`,
    '',
    '**Table of Contents**',
    '',
    ...CATEGORY_ORDER.map(catKey => {
      const catMeta = SERVICE_CATEGORIES[catKey]
      const count = SERVICES.filter(s => s.category === catKey).length
      return `- [${catMeta.label}](#${catKey}) (${count} services)`
    }),
    '',
    '---',
    '',
    sections,
    '',
    '---',
    '',
    `**Master FAQ:** [All FAQs](${SITE_URL}/faqs.md)  `,
    `**Blog:** [Blog & News](${SITE_URL}/feeds/blog.md)  `,
    `**About:** [About Demand Signals](${SITE_URL}/feeds/about)  `,
    `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
  ].join('\n')

  const conditional = checkConditional(request, md)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
