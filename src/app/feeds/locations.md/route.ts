import { COUNTIES, getCountyCities } from '@/lib/counties'
import { SERVICES } from '@/lib/services'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  const totalCities = COUNTIES.reduce((sum, c) => sum + c.citySlugs.length, 0)
  const totalLTPs = totalCities * SERVICES.length

  const countySections = COUNTIES.map(county => {
    const cities = getCountyCities(county)

    const cityEntries = cities.map(city => {
      if (detail === 'summary') {
        return [
          `### ${city.name}`,
          '',
          `> ${city.population} residents | ${city.industries.slice(0, 3).join(', ')}`,
          '',
          `**City hub:** [${city.name}](${SITE_URL}/locations/${county.slug}/${city.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug}/${city.slug})  `,
          `**Services:** ${SERVICES.length} available`,
        ].join('\n')
      }

      const serviceLinks = SERVICES.map(s => {
        const ltpSlug = `${city.slug}-${s.slug}`
        return `  - [${s.searchIntentName}](${SITE_URL}/${ltpSlug}) | [Markdown](${SITE_URL}/feeds/ltp/${ltpSlug})`
      }).join('\n')

      return [
        `### ${city.name}`,
        '',
        `> ${city.population} residents | ${city.county}`,
        '',
        `**Industries:** ${city.industries.join(', ')}  `,
        `**Nearby:** ${city.nearbyAreas.join(', ')}  `,
        `**Services:** ${SERVICES.length} available`,
        '',
        `**City hub:** [${city.name}](${SITE_URL}/locations/${county.slug}/${city.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug}/${city.slug})`,
        '',
        '**Service pages:**',
        serviceLinks,
      ].join('\n')
    }).join('\n\n')

    return [
      `## ${county.name}`,
      '',
      `> ${county.tagline} — ${county.businessCount} businesses | ${county.growthRate}`,
      '',
      `**Top industries:** ${county.topIndustries.join(', ')}  `,
      `**County hub:** [${county.name}](${SITE_URL}/locations/${county.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug})`,
      '',
      cityEntries,
    ].join('\n')
  }).join('\n\n---\n\n')

  const md = [
    '# Demand Signals — Locations Directory',
    '',
    `> ${COUNTIES.length} counties, ${totalCities} cities, ${totalLTPs} city-service landing pages. Complete directory of all service areas.`,
    '',
    '**Table of Contents**',
    '',
    ...COUNTIES.map(c => {
      const cityCount = c.citySlugs.length
      return `- [${c.name}](#${c.slug}) (${cityCount} cities, ${cityCount * SERVICES.length} landing pages)`
    }),
    '',
    '---',
    '',
    countySections,
    '',
    '---',
    '',
    `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
    '',
    `**View on website:** [Locations](${SITE_URL}/locations)  `,
    `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
    `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
    `**Blog:** [Blog & News](${SITE_URL}/feeds/blog.md)  `,
    `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
  ].join('\n')

  const conditional = checkConditional(request, md)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
