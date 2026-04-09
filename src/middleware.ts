import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Service slugs for all 23 services
const SERVICE_SLUGS = new Set([
  'wordpress-development', 'react-next-webapps', 'mobile-apps', 'vibe-coded', 'design', 'hosting',
  'geo-aeo-llm-optimization', 'local-seo', 'geo-targeting', 'gbp-admin', 'systems',
  'ai-content-generation', 'ai-social-media-management', 'ai-review-auto-responders', 'ai-auto-blogging', 'ai-content-repurposing',
  'ai-automation-strategies', 'ai-workforce-automation', 'ai-agent-infrastructure', 'ai-automated-outreach', 'ai-agent-swarms', 'private-llms', 'clawbot-setup',
])

// Category slugs
const CATEGORY_SLUGS = new Set(['websites-apps', 'demand-generation', 'content-social', 'ai-services'])

// Category-to-service mapping for URL pattern matching
const CATEGORY_SERVICE_MAP: Record<string, Set<string>> = {
  'websites-apps': new Set(['wordpress-development', 'react-next-webapps', 'mobile-apps', 'vibe-coded', 'design', 'hosting']),
  'demand-generation': new Set(['geo-aeo-llm-optimization', 'local-seo', 'geo-targeting', 'gbp-admin', 'systems']),
  'content-social': new Set(['ai-content-generation', 'ai-social-media-management', 'ai-review-auto-responders', 'ai-auto-blogging', 'ai-content-repurposing']),
  'ai-services': new Set(['ai-automation-strategies', 'ai-workforce-automation', 'ai-agent-infrastructure', 'ai-automated-outreach', 'ai-agent-swarms', 'private-llms', 'clawbot-setup']),
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Skip feed/API/static paths
  if (pathname.startsWith('/feeds/') || pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/feed.') || pathname.startsWith('/faqs.md') || pathname.startsWith('/content-index.json')) {
    return response
  }

  let markdownPath: string | null = null

  // Blog posts: /blog/some-slug -> /feeds/blog/some-slug
  if (pathname.startsWith('/blog/') && pathname !== '/blog') {
    const slug = pathname.replace('/blog/', '')
    if (slug && !slug.includes('/')) {
      markdownPath = `/feeds/blog/${slug}`
    }
  }

  // Service pages: /websites-apps/wordpress-development -> /feeds/services/wordpress-development
  for (const [category, services] of Object.entries(CATEGORY_SERVICE_MAP)) {
    if (pathname.startsWith(`/${category}/`)) {
      const slug = pathname.replace(`/${category}/`, '')
      if (services.has(slug)) {
        markdownPath = `/feeds/services/${slug}`
      }
    }
  }

  // Category index pages: /websites-apps -> /feeds/categories/websites-apps
  const trimmed = pathname.replace(/^\//, '')
  if (CATEGORY_SLUGS.has(trimmed)) {
    markdownPath = `/feeds/categories/${trimmed}`
  }

  // About page
  if (pathname === '/about') {
    markdownPath = '/feeds/about'
  }

  // Homepage
  if (pathname === '/') {
    markdownPath = '/feeds/pages/home'
  }

  // Static pages
  const STATIC_PAGES = new Set(['contact', 'portfolio', 'team', 'terms', 'privacy', 'accessibility'])
  if (STATIC_PAGES.has(trimmed)) {
    markdownPath = `/feeds/pages/${trimmed}`
  }

  // Tools index
  if (pathname === '/tools') {
    markdownPath = '/feeds/pages/tools'
  }

  // Individual tools: /tools/demand-audit → /feeds/pages/tools/demand-audit
  const TOOL_SLUGS = new Set(['demand-audit', 'demand-links', 'dynamic-qr', 'research-reports'])
  if (pathname.startsWith('/tools/')) {
    const toolSlug = pathname.replace('/tools/', '')
    if (TOOL_SLUGS.has(toolSlug)) {
      markdownPath = `/feeds/pages/tools/${toolSlug}`
    }
  }

  // Locations index
  if (pathname === '/locations') {
    markdownPath = '/feeds/locations'
  }

  // County hubs: /locations/el-dorado-county → /feeds/locations/el-dorado-county
  const COUNTY_SLUGS_SET = new Set(['el-dorado-county', 'sacramento-county', 'placer-county', 'amador-county', 'nevada-county'])
  const locationMatch = pathname.match(/^\/locations\/([^/]+)$/)
  if (locationMatch && COUNTY_SLUGS_SET.has(locationMatch[1])) {
    markdownPath = `/feeds/locations/${locationMatch[1]}`
  }

  // City hubs: /locations/el-dorado-county/el-dorado-hills → /feeds/locations/el-dorado-county/el-dorado-hills
  const cityMatch = pathname.match(/^\/locations\/([^/]+)\/([^/]+)$/)
  if (cityMatch && COUNTY_SLUGS_SET.has(cityMatch[1])) {
    markdownPath = `/feeds/locations/${cityMatch[1]}/${cityMatch[2]}`
  }

  // LTP pages: /el-dorado-hills-wordpress-development → /feeds/ltp/el-dorado-hills-wordpress-development
  // These are root-level dynamic pages that aren't blog, category, service, or static pages
  if (!markdownPath && !pathname.startsWith('/blog') && !pathname.startsWith('/locations') && !pathname.startsWith('/tools') && !pathname.startsWith('/feeds') && !pathname.startsWith('/api') && !pathname.startsWith('/spacegame')) {
    const rootSlug = trimmed
    // LTP slugs contain a city name + service name joined by hyphens
    // They match the pattern: [city]-[service] with at least two segments
    if (rootSlug && rootSlug.includes('-') && !CATEGORY_SLUGS.has(rootSlug) && !STATIC_PAGES.has(rootSlug) && rootSlug !== 'about') {
      // Check if it looks like a LTP (contains a known service slug suffix)
      for (const svc of SERVICE_SLUGS) {
        if (rootSlug.endsWith(`-${svc}`) || rootSlug.endsWith(svc)) {
          markdownPath = `/feeds/ltp/${rootSlug}`
          break
        }
      }
    }
  }

  if (markdownPath) {
    response.headers.set('Link', `<${markdownPath}>; rel=alternate; type=text/markdown`)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2)).*)',
  ],
}
