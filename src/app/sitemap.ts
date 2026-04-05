import type { MetadataRoute } from 'next'
import { CITY_SLUGS } from '@/lib/cities'

const BASE = 'https://demandsignals.co'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const core: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    // Websites & Apps
    { url: `${BASE}/websites-apps`,                              lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/websites-apps/wordpress-development`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/react-next-webapps`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/mobile-apps`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/vibe-coded`,                   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/websites-apps/design`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/websites-apps/hosting`,                      lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // Demand Generation
    { url: `${BASE}/demand-generation`,                          lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/demand-generation/geo-aeo-llm-optimization`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/demand-generation/local-seo`,                lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/demand-generation/geo-targeting`,            lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/demand-generation/gbp-admin`,                lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/demand-generation/systems`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // Content & Social
    { url: `${BASE}/content-social`,                             lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/content-social/ai-content-generation`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/content-social/ai-social-media-management`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/content-social/ai-review-auto-responders`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/content-social/ai-auto-blogging`,            lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/content-social/ai-content-repurposing`,      lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // AI & Agent Services
    { url: `${BASE}/ai-services`,                                lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/ai-services/ai-automation-strategies`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/ai-workforce-automation`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/ai-agent-infrastructure`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-services/ai-automated-outreach`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/ai-agent-swarms`,                lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-services/private-llms`,                   lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-services/clawbot-setup`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // Tools
    { url: `${BASE}/tools`,               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/demand-audit`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/research-reports`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/tools/demand-links`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/tools/dynamic-qr`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    // Learn / Company
    { url: `${BASE}/locations`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/portfolio`,           lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about/team`,          lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.8 },
  ]

  const cities: MetadataRoute.Sitemap = CITY_SLUGS.map((slug) => ({
    url:             `${BASE}/locations/${slug}`,
    lastModified:    now,
    changeFrequency: 'monthly',
    priority:        0.7,
  }))

  return [...core, ...cities]
}
