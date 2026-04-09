import { getCityBySlug } from '@/lib/cities'
import { getCountyBySlug, getCountyForCity } from '@/lib/counties'
import { SERVICES, SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/services'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const CATEGORY_ORDER: ServiceCategory[] = ['websites-apps', 'demand-generation', 'content-social', 'ai-services']

/** Dynamic FAQs — mirrors src/app/locations/[county]/[city]/page.tsx getCityFaqs() */
function getCityFaqs(cityName: string, county: string) {
  return [
    {
      question: `What AI marketing services does Demand Signals offer in ${cityName}?`,
      answer: `We offer a complete suite of AI-powered marketing services for ${cityName} businesses — including custom websites, local SEO and Google Maps optimization, GEO/LLM optimization for AI search, AI content generation, social media automation, review management, AI agent swarms, and automated outreach. Every service is configured specifically for the ${cityName} market, targeting the competitors, keywords, and customer behaviors unique to ${county}.`,
    },
    {
      question: `How quickly can I expect results from AI marketing in ${cityName}?`,
      answer: `Most ${cityName} clients see measurable improvements within the first 30 days, with significant ranking gains and lead volume increases by month three. AI-powered systems work around the clock — publishing content, responding to reviews, and optimizing campaigns while you sleep. The speed of results depends on your industry's competitiveness in ${cityName}, but our three-layer discovery strategy (SEO + GEO + AEO) accelerates visibility across all channels simultaneously.`,
    },
    {
      question: `How much does AI marketing cost for a ${cityName} business?`,
      answer: `Our services are structured to replace the cost of a marketing employee or traditional agency retainer. AI-powered websites range from $5K to $25K with monthly management starting at $800. Content, reputation, and social automation packages start at $800 per month. We build custom proposals based on your ${cityName} market, competitive landscape, and business goals — and the first consultation is always free.`,
    },
    {
      question: `What makes Demand Signals the best marketing agency for ${cityName} businesses?`,
      answer: `Unlike traditional agencies that rely on manual labor and generic templates, we deploy AI agent swarms that handle content creation, review responses, social media, and outreach autonomously. This means ${cityName} businesses get enterprise-level marketing output at a fraction of the cost. We're also based in Northern California — we understand the local market dynamics that national agencies miss entirely.`,
    },
    {
      question: `Can you help my ${cityName} business appear in AI search results like ChatGPT and Perplexity?`,
      answer: `Absolutely — this is one of our core specialties. We call it GEO (Generative Engine Optimization). When ${cityName} consumers ask ChatGPT, Gemini, Perplexity, or any AI assistant for local recommendations, your business needs to be cited. We build the structured data, entity authority signals, llms.txt files, and citation network that gets your business recommended by AI — not just indexed by Google.`,
    },
  ]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ county: string; city: string }> },
) {
  const { county: countySlug, city: citySlug } = await params
  const county = getCountyBySlug(countySlug)
  const city = getCityBySlug(citySlug)

  if (!county || !city || !county.citySlugs.includes(citySlug)) {
    return new Response(
      `# 404 — City Not Found\n\nNo city page exists at this URL.\n\n**All locations:** [Locations Directory](${SITE_URL}/feeds/locations.md)\n`,
      { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
    )
  }

  const detail = getDetailLevel(request)
  const faqs = getCityFaqs(city.name, city.county)
  const cityCounty = getCountyForCity(city.slug)

  /* ── Summary mode ────────────────────────────────────────────── */
  if (detail === 'summary') {
    const md = [
      `# ${city.name}, ${city.state} | Demand Signals`,
      '',
      `> ${city.heroSubtitle}`,
      '',
      `**County:** ${city.county}  `,
      `**Population:** ${city.population}  `,
      `**Industries:** ${city.industries.join(', ')}  `,
      `**Services available:** ${SERVICES.length}`,
      '',
      `**City hub:** [${city.name}](${SITE_URL}/locations/${county.slug}/${city.slug})`,
      '',
      '---',
      '',
      `**Full details:** [${city.name} (full)](${SITE_URL}/feeds/locations/${county.slug}/${city.slug}?detail=full)  `,
      `**County:** [${county.name}](${SITE_URL}/feeds/locations/${county.slug})  `,
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
  const statsLine = city.stats.map(s => `${s.value} ${s.label}`).join(' | ')

  const servicesByCategory = CATEGORY_ORDER.map(catKey => {
    const cat = SERVICE_CATEGORIES[catKey]
    const services = SERVICES.filter(s => s.category === catKey)
    const items = services.map(s => {
      const ltpSlug = `${city.slug}-${s.slug}`
      return `  - ${s.icon} **${s.searchIntentName} in ${city.name}** — ${s.tagline}  \n    [Service page](${SITE_URL}/${ltpSlug}) | [Markdown](${SITE_URL}/feeds/ltp/${ltpSlug})`
    }).join('\n')
    return `- **${cat.label}**\n${items}`
  }).join('\n')

  const featuresSection = city.features
    .map(f => `### ${f.title}\n\n${f.description}`)
    .join('\n\n')

  const faqSection = faqs
    .map(faq => `### ${faq.question}\n\n${faq.answer}`)
    .join('\n\n')

  const nearbySection = city.nearbyAreas.map(area => `- ${area}`).join('\n')

  const countySlugForLink = cityCounty?.slug ?? countySlug

  const md = [
    `# ${city.name}, ${city.state} — AI Marketing | Demand Signals`,
    '',
    `> ${city.heroSubtitle}`,
    '',
    '## Overview',
    '',
    city.description,
    '',
    `**County:** ${city.county}  `,
    `**Population:** ${city.population}  `,
    `**Key stats:** ${statsLine}  `,
    `**Industries:** ${city.industries.join(', ')}  `,
    `**Local landmarks:** ${city.localTerms.join(', ')}`,
    '',
    '## Why Businesses in ' + city.name + ' Choose AI Marketing',
    '',
    featuresSection,
    '',
    `## All ${SERVICES.length} Services Available in ${city.name}`,
    '',
    `Every service below has a dedicated landing page targeting the ${city.name} market with localized content, FAQ, and schema markup.`,
    '',
    servicesByCategory,
    '',
    '## Nearby Areas',
    '',
    `We also serve businesses in the following areas near ${city.name}:`,
    '',
    nearbySection,
    '',
    '## Frequently Asked Questions',
    '',
    faqSection,
    '',
    '---',
    '',
    `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
    '',
    `**View on website:** [${city.name}](${SITE_URL}/locations/${countySlugForLink}/${city.slug})  `,
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
