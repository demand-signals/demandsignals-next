import { getCityBySlug } from '@/lib/cities'
import { SERVICES, getServiceBySlug, SERVICE_CATEGORIES } from '@/lib/services'
import { getCountyForCity } from '@/lib/counties'
import { getCityServiceBySlug } from '@/lib/city-service-slugs'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

/** Fill {city}, {county}, {state} template variables */
function fillTemplate(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{city\}/g, vars.city)
    .replace(/\{county\}/g, vars.county)
    .replace(/\{state\}/g, vars.state)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cityService: string }> },
) {
  const { cityService } = await params
  const match = getCityServiceBySlug(cityService)

  if (!match) {
    return new Response(
      `# 404 — Page Not Found\n\nNo city-service page exists for this slug.\n\n**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)  \n**All services:** [Services Directory](${SITE_URL}/feeds/services.md)\n`,
      { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
    )
  }

  const city = getCityBySlug(match.citySlug)
  const service = getServiceBySlug(match.serviceSlug)
  if (!city || !service) {
    return new Response(
      `# 404 — Page Not Found\n\nCity or service data not found.\n\n**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)\n`,
      { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
    )
  }

  const county = getCountyForCity(city.slug)
  const countyName = county?.name ?? city.county
  const countySlug = county?.slug ?? ''
  const catMeta = SERVICE_CATEGORIES[service.category]
  const vars = { city: city.name, county: countyName, state: city.state }
  const canonicalSlug = `${city.slug}-${service.slug}`
  const detail = getDetailLevel(request)

  /* ── Summary mode ────────────────────────────────────────────── */
  if (detail === 'summary') {
    const md = [
      `# ${service.searchIntentName} in ${city.name}, ${city.state} | Demand Signals`,
      '',
      `> ${fillTemplate(service.tagline, vars)}`,
      '',
      `**City:** ${city.name}, ${city.state}  `,
      `**Service:** ${service.name}  `,
      `**Category:** ${catMeta.label}  `,
      `**URL:** ${SITE_URL}/${canonicalSlug}`,
      '',
      '---',
      '',
      `**Full details:** [Full page](${SITE_URL}/feeds/ltp/${canonicalSlug}?detail=full)  `,
      `**City hub:** [${city.name}](${SITE_URL}/locations/${countySlug}/${city.slug})  `,
      `**Service details:** [${service.name}](${SITE_URL}/feeds/services/${service.slug})  `,
      `**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)`,
    ].join('\n')

    const conditional = checkConditional(request, md)
    if (conditional) return conditional

    return new Response(md, {
      status: 200,
      headers: feedHeaders('text/markdown', md),
    })
  }

  /* ── Full mode ───────────────────────────────────────────────── */
  const features = service.features.map(f => `- ${f}`).join('\n')

  const filledFaqs = service.faqTemplates.map(faq => ({
    question: fillTemplate(faq.question, vars),
    answer: fillTemplate(faq.answer, vars),
  }))
  const faqSection = filledFaqs
    .map(faq => `### ${faq.question}\n\n${faq.answer}`)
    .join('\n\n')

  const keywords = service.keywordTemplates.map(k => fillTemplate(k, vars))

  /* Related services in same category */
  const relatedServices = SERVICES
    .filter(s => s.category === service.category && s.slug !== service.slug)
    .slice(0, 5)
    .map(s => `- [${s.searchIntentName} in ${city.name}](${SITE_URL}/${city.slug}-${s.slug})`)
    .join('\n')

  const md = [
    `# ${service.searchIntentName} in ${city.name}, ${city.state} | Demand Signals`,
    '',
    `> ${fillTemplate(service.tagline, vars)}`,
    '',
    `**City:** ${city.name}, ${city.state} (${city.population} residents)  `,
    `**County:** ${countyName}  `,
    `**Service:** ${service.name}  `,
    `**Category:** ${catMeta.label}  `,
    `**URL:** ${SITE_URL}/${canonicalSlug}`,
    '',
    '## Overview',
    '',
    fillTemplate(service.description, vars),
    '',
    "## What's Included",
    '',
    features,
    '',
    '## About the ' + city.name + ' Market',
    '',
    city.description,
    '',
    `**Key industries:** ${city.industries.join(', ')}  `,
    `**Local landmarks:** ${city.localTerms.join(', ')}  `,
    `**Nearby areas:** ${city.nearbyAreas.join(', ')}`,
    '',
    '## Target Keywords',
    '',
    keywords.map(k => `- ${k}`).join('\n'),
    '',
    '## Frequently Asked Questions',
    '',
    faqSection,
    '',
    '## Related Services in ' + city.name,
    '',
    relatedServices,
    '',
    '---',
    '',
    `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
    '',
    `**View on website:** [${service.searchIntentName} in ${city.name}](${SITE_URL}/${canonicalSlug})  `,
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
