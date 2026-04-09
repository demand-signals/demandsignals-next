import { COUNTIES, getCountyCities } from '@/lib/counties'
import { SERVICES } from '@/lib/services'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

/* ── Locations FAQs (mirrors src/app/locations/page.tsx) ─────── */
const locationsFaqs = [
  {
    question: 'Do I need to be in Northern California to work with Demand Signals?',
    answer: 'Not at all. While our roots are in El Dorado County, NorCal, our AI systems serve businesses anywhere in the world. We have active clients across the United States, Australia, Thailand, and beyond. Website development, AI content generation, GEO optimization, and agent swarms work for any market. For local SEO specifically, we configure our systems to your city, not ours.',
  },
  {
    question: 'What makes Demand Signals different for local Northern California businesses?',
    answer: "We're based here. We know the competition in El Dorado Hills. We understand that Folsom businesses compete differently than Placerville businesses. We know Roseville's retail landscape and Truckee's tourist-driven seasonality. That local intelligence gets baked into every AI system we build — and it's something no national agency can replicate from a remote office.",
  },
  {
    question: 'How does local market knowledge improve AI marketing results?',
    answer: "AI marketing performs dramatically better when trained on local competitive data, seasonal demand patterns, and regional search behavior. For our NorCal clients, we feed real market intelligence into every system — the competitors your customers are comparing you to, the specific keyword patterns in your zip code, and the consumer behaviors unique to your county. The result is a system that outperforms generic national campaigns by a significant margin.",
  },
  {
    question: 'Can you handle multiple locations for businesses with several branches?',
    answer: "Multi-location businesses are one of our specialties. We build city-specific landing pages, manage separate Google Business Profiles for each location, and run AI content generation tuned to each market. Our agent swarms can handle review responses, social media, and outreach for every location simultaneously — without additional headcount on your end.",
  },
  {
    question: 'Which county or city should I focus on if I serve multiple areas?',
    answer: "We'll tell you based on data, not guesswork. Our free intelligence report analyzes search volume, competition levels, and opportunity gaps across every market you serve — and ranks them by ROI potential. Most multi-area businesses are surprised to find their highest-opportunity market isn't the one they've been focusing on.",
  },
]

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  const totalCities = COUNTIES.reduce((sum, c) => sum + c.citySlugs.length, 0)

  /* ── County sections ─────────────────────────────────────────── */
  const countySections = COUNTIES.map(county => {
    const cities = getCountyCities(county)

    const cityLines = cities.map(city => {
      if (detail === 'summary') {
        return `- **${city.name}** — ${city.population} residents | [City Hub](${SITE_URL}/locations/${county.slug}/${city.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug}/${city.slug})`
      }
      return [
        `### ${city.name}`,
        '',
        `> ${city.population} residents | ${city.industries.slice(0, 4).join(', ')}`,
        '',
        city.description,
        '',
        `**Industries:** ${city.industries.join(', ')}  `,
        `**Nearby areas:** ${city.nearbyAreas.join(', ')}  `,
        `**Services available:** ${SERVICES.length}`,
        '',
        `**City hub:** [${city.name}](${SITE_URL}/locations/${county.slug}/${city.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug}/${city.slug})`,
      ].join('\n')
    }).join('\n\n')

    if (detail === 'summary') {
      return [
        `## ${county.name}`,
        '',
        `> ${county.tagline} — ${county.subtitle}`,
        '',
        `**Businesses:** ${county.businessCount} | **Growth:** ${county.growthRate}  `,
        `**County hub:** [${county.name}](${SITE_URL}/locations/${county.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug})`,
        '',
        cityLines,
      ].join('\n')
    }

    return [
      `## ${county.name}`,
      '',
      `> ${county.tagline} — ${county.subtitle}`,
      '',
      county.description,
      '',
      `**Businesses:** ${county.businessCount}  `,
      `**Growth:** ${county.growthRate}  `,
      `**Top industries:** ${county.topIndustries.join(', ')}  `,
      `**Cities served:** ${cities.length}`,
      '',
      `**County hub:** [${county.name}](${SITE_URL}/locations/${county.slug}) | [Markdown](${SITE_URL}/feeds/locations/${county.slug})`,
      '',
      `### Cities in ${county.name}`,
      '',
      cityLines,
    ].join('\n')
  }).join('\n\n---\n\n')

  /* ── FAQs (full mode only) ───────────────────────────────────── */
  const faqSection = detail === 'full'
    ? [
        '## Frequently Asked Questions',
        '',
        ...locationsFaqs.map(faq => `### ${faq.question}\n\n${faq.answer}`),
      ].join('\n\n')
    : ''

  const md = [
    '# Demand Signals — Service Locations',
    '',
    `> AI-powered demand generation across ${COUNTIES.length} Northern California counties, ${totalCities} city markets, and clients worldwide. Based in El Dorado County, CA.`,
    '',
    '**Table of Contents**',
    '',
    ...COUNTIES.map(c => {
      const cityCount = c.citySlugs.length
      return `- [${c.name}](#${c.slug}) (${cityCount} cities)`
    }),
    '',
    '---',
    '',
    countySections,
    '',
    ...(faqSection ? ['---', '', faqSection, ''] : []),
    '---',
    '',
    `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
    '',
    `**View on website:** [Locations](${SITE_URL}/locations)  `,
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
