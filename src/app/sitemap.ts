import type { MetadataRoute } from 'next'
import { COUNTY_SLUGS, getCountyBySlug } from '@/lib/counties'
import { ALL_CITY_SERVICE_SLUGS } from '@/lib/city-service-slugs'
import { getAllPosts } from '@/lib/blog'

const BASE = 'https://demandsignals.co'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticDate = new Date().toISOString().split('T')[0]

  /* ── PRIORITY 1.0 — Homepage, Contact, Category Indexes, Blog Index ────── */
  const priority1: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: staticDate, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/contact`,             lastModified: staticDate, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/websites-apps`,       lastModified: staticDate, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/demand-generation`,   lastModified: staticDate, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/content-social`,      lastModified: staticDate, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/ai-services`,         lastModified: staticDate, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/blog`,                lastModified: staticDate, changeFrequency: 'daily',   priority: 1.0 },
  ]

  /* ── PRIORITY 0.9 — Individual Service Pages ──────────────────────────── */
  const servicePages: MetadataRoute.Sitemap = [
    // Websites & Apps
    `${BASE}/websites-apps/wordpress-development`,
    `${BASE}/websites-apps/react-next-webapps`,
    `${BASE}/websites-apps/mobile-apps`,
    `${BASE}/websites-apps/vibe-coded`,
    `${BASE}/websites-apps/design`,
    `${BASE}/websites-apps/hosting`,
    // Demand Generation
    `${BASE}/demand-generation/geo-aeo-llm-optimization`,
    `${BASE}/demand-generation/local-seo`,
    `${BASE}/demand-generation/geo-targeting`,
    `${BASE}/demand-generation/gbp-admin`,
    `${BASE}/demand-generation/systems`,
    // Content & Social
    `${BASE}/content-social/ai-content-generation`,
    `${BASE}/content-social/ai-social-media-management`,
    `${BASE}/content-social/ai-review-auto-responders`,
    `${BASE}/content-social/ai-auto-blogging`,
    `${BASE}/content-social/ai-content-repurposing`,
    // AI & Agent Services
    `${BASE}/ai-services/ai-automation-strategies`,
    `${BASE}/ai-services/ai-workforce-automation`,
    `${BASE}/ai-services/ai-agent-infrastructure`,
    `${BASE}/ai-services/ai-automated-outreach`,
    `${BASE}/ai-services/ai-agent-swarms`,
    `${BASE}/ai-services/private-llms`,
    `${BASE}/ai-services/clawbot-setup`,
  ].map(url => ({
    url,
    lastModified: staticDate,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  /* ── PRIORITY 0.8 — Blog Posts ─────────────────────────────────────────── */
  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url:             `${BASE}/blog/${post.slug}`,
    lastModified:    post.date || staticDate,
    changeFrequency: 'monthly' as const,
    priority:        0.8,
  }))

  /* ── PRIORITY 0.7 — Long Tail Pages (city × service) ──────────────────── */
  const ltps: MetadataRoute.Sitemap = ALL_CITY_SERVICE_SLUGS
    .filter(slug => !slug.includes('-web-developer') && !slug.includes('-websites'))
    .map((slug) => ({
      url:             `${BASE}/${slug}`,
      lastModified:    staticDate,
      changeFrequency: 'monthly' as const,
      priority:        0.7,
    }))

  /* ── PRIORITY 0.6 — Category Pages (locations, tools, about, portfolio) ─ */
  const categoryPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/locations`,           lastModified: staticDate, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/portfolio`,           lastModified: staticDate, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/about`,               lastModified: staticDate, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/team`,                lastModified: staticDate, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/tools`,               lastModified: staticDate, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/tools/demand-audit`,  lastModified: staticDate, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/tools/research-reports`, lastModified: staticDate, changeFrequency: 'weekly' as const, priority: 0.6 },
  ]

  /* County hub pages */
  const counties: MetadataRoute.Sitemap = COUNTY_SLUGS.map((slug) => ({
    url:             `${BASE}/locations/${slug}`,
    lastModified:    staticDate,
    changeFrequency: 'monthly' as const,
    priority:        0.6,
  }))

  /* City hub pages */
  const cityHubs: MetadataRoute.Sitemap = COUNTY_SLUGS.flatMap((countySlug) => {
    const county = getCountyBySlug(countySlug)
    if (!county) return []
    return county.citySlugs.map((citySlug) => ({
      url:             `${BASE}/locations/${countySlug}/${citySlug}`,
      lastModified:    staticDate,
      changeFrequency: 'monthly' as const,
      priority:        0.6,
    }))
  })

  /* ── PRIORITY 0.5 — Compliance Pages ───────────────────────────────────── */
  const compliance: MetadataRoute.Sitemap = [
    { url: `${BASE}/privacy`,        lastModified: staticDate, changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${BASE}/terms`,          lastModified: staticDate, changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${BASE}/accessibility`,  lastModified: staticDate, changeFrequency: 'yearly' as const, priority: 0.5 },
  ]

  return [
    ...priority1,
    ...servicePages,
    ...blogPosts,
    ...ltps,
    ...categoryPages,
    ...counties,
    ...cityHubs,
    ...compliance,
  ]
}
