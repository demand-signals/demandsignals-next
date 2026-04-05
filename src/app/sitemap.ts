import type { MetadataRoute } from 'next'
import { CITY_SLUGS } from '@/lib/cities'

const BASE = 'https://demandsignals.co'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const core: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/services`,            lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/services/websites`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/services/wordpress`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/services/nextjs-webapps`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/services/vibe-coded`,     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/services/mobile-apps`,    lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/services/ui-ux-design`,   lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/services/local-demand`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/services/content`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-agents`,           lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/ai-agents/agent-farms`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-agents/voice`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-agents/automation`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-agents/outreach`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/ai-agents/geo-llm`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/ai-agents/infrastructure`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools`,               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/demand-audit`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/research-reports`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/tools/demand-links`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/tools/dynamic-qr`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/locations`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/portfolio`,           lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
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
