import { getCountyBySlug, getCountyCities } from '@/lib/counties'
import { SERVICES, SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/services'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const CATEGORY_ORDER: ServiceCategory[] = ['websites-apps', 'demand-generation', 'content-social', 'ai-services']

/** Dynamic FAQs — mirrors src/app/locations/[county]/page.tsx getCountyFaqs() */
function getCountyFaqs(countyName: string, shortName: string, businessCount: string) {
  return [
    {
      question: `What AI marketing services does Demand Signals offer in ${countyName}?`,
      answer: `We offer a complete AI marketing suite for ${countyName} businesses: AI-powered websites, local SEO & Google Maps optimization, GEO/LLM optimization for AI search engines, AI content generation, social media automation, review management, AI agent swarms, and automated outreach. Every service is configured for the ${shortName} market — targeting the competitors, keywords, and customer behaviors unique to each city in the county.`,
    },
    {
      question: `How many businesses does Demand Signals serve in ${countyName}?`,
      answer: `${countyName} has ${businessCount} local businesses, and we serve clients across every major city in the county. Our AI systems are configured specifically for the ${shortName} market — we know the competition, the seasonal patterns, and the customer behaviors that drive local business success here.`,
    },
    {
      question: `Why choose a local ${countyName} marketing agency over a national one?`,
      answer: `A national agency runs the same playbook for ${countyName} that they run for Miami or Chicago. We live and work here. We know which ${shortName} businesses are dominating local search, which neighborhoods are growing fastest, and which industries are underserved. That local intelligence gets baked into every AI system we build — and it's something no remote agency can replicate.`,
    },
    {
      question: `What makes AI marketing different from traditional marketing in ${countyName}?`,
      answer: `Traditional marketing relies on manual labor — someone writing blog posts, someone managing social media, someone responding to reviews. AI marketing deploys autonomous agents that handle all of this 24/7, at a fraction of the cost. For ${countyName} businesses, this means enterprise-level marketing output without the enterprise-level headcount. Our AI agent swarms publish content, respond to reviews, manage social media, and generate leads around the clock.`,
    },
    {
      question: `How quickly can I expect results from AI marketing in ${countyName}?`,
      answer: `Most ${countyName} clients see measurable improvements within 30 days — improved rankings, increased review velocity, and consistent content publishing. Significant lead volume increases typically happen by month three. Our three-layer discovery strategy (SEO + GEO + AEO) accelerates results by building visibility across Google, AI Overviews, and answer engines simultaneously.`,
    },
  ]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ county: string }> },
) {
  const { county: countySlug } = await params
  const county = getCountyBySlug(countySlug)

  if (!county) {
    return new Response(
      `# 404 — County Not Found\n\nNo county exists at this URL.\n\n**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)\n`,
      { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
    )
  }

  const detail = getDetailLevel(request)
  const cities = getCountyCities(county)
  const faqs = getCountyFaqs(county.name, county.shortName, county.businessCount)

  /* ── Summary mode ────────────────────────────────────────────── */
  if (detail === 'summary') {
    const md = [
      `# ${county.name} | Demand Signals`,
      '',
      `> ${county.tagline} — ${county.subtitle}`,
      '',
      `**Businesses:** ${county.businessCount}  `,
      `**Growth:** ${county.growthRate}  `,
      `**Cities:** ${cities.map(c => c.name).join(', ')}`,
      '',
      `**County hub:** [${county.name}](${SITE_URL}/locations/${county.slug})`,
      '',
      '---',
      '',
      `**Full details:** [${county.name} (full)](${SITE_URL}/feeds/locations/${county.slug}?detail=full)  `,
      `**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)`,
    ].join('\n')

    const conditional = checkConditional(request, md)
    if (conditional) return conditional

    return new Response(md, {
      status: 200,
      headers: feedHeaders('text/markdown', md),
    })
  }

  /* ── Full mode ───────────────────────────────────────────────── */
  const cityCards = cities.map(city => [
    `### ${city.name}`,
    '',
    `> ${city.population} residents | ${city.county}`,
    '',
    city.description,
    '',
    `**Industries:** ${city.industries.join(', ')}  `,
    `**Nearby areas:** ${city.nearbyAreas.join(', ')}  `,
    `**Services available:** ${SERVICES.length}`,
    '',
    `**City hub:** [${city.name}](${SITE_URL}/locations/${county.slug}/${city.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug}/${city.slug})`,
  ].join('\n')).join('\n\n')

  const statsLine = county.stats.map(s => `${s.value} ${s.label}`).join(' | ')

  const serviceList = CATEGORY_ORDER.map(catKey => {
    const cat = SERVICE_CATEGORIES[catKey]
    const services = SERVICES.filter(s => s.category === catKey)
    const items = services.map(s => `  - ${s.icon} ${s.shortName} — [Details](${SITE_URL}${s.parentHref})`).join('\n')
    return `- **${cat.label}**\n${items}`
  }).join('\n')

  const faqSection = faqs
    .map(faq => `### ${faq.question}\n\n${faq.answer}`)
    .join('\n\n')

  const md = [
    `# ${county.name} — AI Marketing | Demand Signals`,
    '',
    `> ${county.tagline} — ${county.subtitle}`,
    '',
    '## Overview',
    '',
    county.description,
    '',
    `**Key stats:** ${statsLine}  `,
    `**Businesses:** ${county.businessCount}  `,
    `**Growth:** ${county.growthRate}  `,
    `**Top industries:** ${county.topIndustries.join(', ')}`,
    '',
    `## Cities in ${county.name}`,
    '',
    cityCards,
    '',
    `## Services Available Across ${county.name}`,
    '',
    `All ${SERVICES.length} services are available in every city. Each city has dedicated landing pages for each service.`,
    '',
    serviceList,
    '',
    '## Frequently Asked Questions',
    '',
    faqSection,
    '',
    '---',
    '',
    `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
    '',
    `**View on website:** [${county.name}](${SITE_URL}/locations/${county.slug})  `,
    `**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)  `,
    `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
    `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
    `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
  ].join('\n')

  const conditional = checkConditional(request, md)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
