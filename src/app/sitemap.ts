import type { MetadataRoute } from 'next'
import { COUNTY_SLUGS, getCountyBySlug } from '@/lib/counties'
import { ALL_CITY_SERVICE_SLUGS } from '@/lib/city-service-slugs'
import { getAllPosts } from '@/lib/blog'

const BASE = 'https://demandsignals.co'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticDate = '2026-04-07'

  const core: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: staticDate, changeFrequency: 'weekly',  priority: 1.0 },
    // Websites & Apps
    { url: `${BASE}/websites-apps`,                              lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/websites-apps/wordpress-development`,        lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/react-next-webapps`,           lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/mobile-apps`,                  lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/vibe-coded`,                   lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/design`,                       lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/websites-apps/hosting`,                      lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6 },
    // Demand Generation
    { url: `${BASE}/demand-generation`,                          lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/demand-generation/geo-aeo-llm-optimization`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/demand-generation/local-seo`,                lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/demand-generation/geo-targeting`,            lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/demand-generation/gbp-admin`,                lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/demand-generation/systems`,                  lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    // Content & Social
    { url: `${BASE}/content-social`,                             lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/content-social/ai-content-generation`,       lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/content-social/ai-social-media-management`,  lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/content-social/ai-review-auto-responders`,   lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/content-social/ai-auto-blogging`,            lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/content-social/ai-content-repurposing`,      lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    // AI & Agent Services
    { url: `${BASE}/ai-services`,                                lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/ai-services/ai-automation-strategies`,       lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/ai-workforce-automation`,        lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/ai-agent-infrastructure`,        lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-services/ai-automated-outreach`,          lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/ai-agent-swarms`,                lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/private-llms`,                   lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-services/clawbot-setup`,                  lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6 },
    // Tools
    { url: `${BASE}/tools`,               lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/demand-audit`,  lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/research-reports`, lastModified: staticDate, changeFrequency: 'weekly', priority: 0.7 },
    // demand-links and dynamic-qr excluded — "coming soon" placeholders
    // Learn / Company
    { url: `${BASE}/locations`,           lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`,                lastModified: staticDate, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/portfolio`,           lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`,               lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about/team`,          lastModified: staticDate, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,             lastModified: staticDate, changeFrequency: 'yearly',  priority: 0.8 },
    // Legal / Policy
    { url: `${BASE}/privacy`,             lastModified: staticDate, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,               lastModified: staticDate, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/accessibility`,        lastModified: staticDate, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  /* County hub pages: /locations/{county}-county */
  const counties: MetadataRoute.Sitemap = COUNTY_SLUGS.map((slug) => ({
    url:             `${BASE}/locations/${slug}`,
    lastModified:    staticDate,
    changeFrequency: 'monthly',
    priority:        0.8,
  }))

  /* City hub pages: /locations/{county}/{city} */
  const cityHubs: MetadataRoute.Sitemap = COUNTY_SLUGS.flatMap((countySlug) => {
    const county = getCountyBySlug(countySlug)
    if (!county) return []
    return county.citySlugs.map((citySlug) => ({
      url:             `${BASE}/locations/${countySlug}/${citySlug}`,
      lastModified:    staticDate,
      changeFrequency: 'monthly',
      priority:        0.7,
    }))
  })

  /* Root-level LTP pages: /{city}-{service} (529 core, excludes aliases) */
  const ltps: MetadataRoute.Sitemap = ALL_CITY_SERVICE_SLUGS
    .filter(slug => !slug.includes('-web-developer') && !slug.includes('-websites'))
    .map((slug) => ({
      url:             `${BASE}/${slug}`,
      lastModified:    staticDate,
      changeFrequency: 'monthly',
      priority:        0.6,
    }))

  /* Blog posts */
  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url:             `${BASE}/blog/${post.slug}`,
    lastModified:    post.date || staticDate,
    changeFrequency: 'monthly',
    priority:        0.5,
  }))

  return [...core, ...counties, ...cityHubs, ...ltps, ...blogPosts]
}
