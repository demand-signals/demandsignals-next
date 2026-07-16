import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Service slugs — used to power markdown feed routes at /feeds/services/<slug>.
// Legacy slugs (wordpress-development, react-next-webapps, vibe-coded) are
// preserved so the /feeds/services/<old-slug>.md endpoints remain stable
// for any AI crawler that already cached them. The 2 new services
// (free-html-website, vite-website) are appended.
const SERVICE_SLUGS = new Set([
  'free-html-website', 'vite-website',
  'wordpress-development', 'react-next-webapps', 'mobile-apps', 'vibe-coded', 'design', 'hosting',
  'geo-aeo-llm-optimization', 'local-seo', 'geo-targeting', 'gbp-admin', 'systems',
  'ai-content-generation', 'ai-social-media-management', 'ai-review-auto-responders', 'ai-auto-blogging', 'ai-content-repurposing',
  'ai-automation-strategies', 'ai-workforce-automation', 'ai-agent-infrastructure', 'ai-automated-outreach', 'ai-agent-swarms', 'private-llms', 'clawbot-setup',
])

// Category slugs
const CATEGORY_SLUGS = new Set(['websites-apps', 'demand-generation', 'content-social', 'ai-services'])

// Category-to-service mapping for URL pattern matching.
// Includes new hub-page slugs (wordpress-website, react-nextjs-webapp,
// vibe-coded-website, free-html-website, vite-website) PLUS the legacy
// slugs that still resolve via 301 redirects (next.config.ts).
const CATEGORY_SERVICE_MAP: Record<string, Set<string>> = {
  'websites-apps': new Set([
    // new hub-page slugs (current canonical URLs)
    'free-html-website', 'vite-website', 'vibe-coded-website', 'wordpress-website', 'react-nextjs-webapp',
    // legacy slugs (301-redirected via next.config.ts, kept here so middleware doesn't 404 in-flight requests)
    'wordpress-development', 'react-next-webapps', 'vibe-coded',
    // unchanged
    'mobile-apps', 'design', 'hosting',
  ]),
  'demand-generation': new Set(['geo-aeo-llm-optimization', 'local-seo', 'geo-targeting', 'gbp-admin', 'systems']),
  'content-social': new Set(['ai-content-generation', 'ai-social-media-management', 'ai-review-auto-responders', 'ai-auto-blogging', 'ai-content-repurposing']),
  'ai-services': new Set(['ai-automation-strategies', 'ai-workforce-automation', 'ai-agent-infrastructure', 'ai-automated-outreach', 'ai-agent-swarms', 'private-llms', 'clawbot-setup']),
}

const DEAD_PREFIXES = [
  '/ProductDetail', '/products/', '/product-category/',
  '/wp-content/', '/wp-admin/', '/wp-json', '/wp-includes', '/wp-login',
]

const DEAD_SLUGS = new Set([
  '/cart', '/shop',
  '/booklets', '/menus', '/pamphlets', '/printed-banners', '/posters',
  '/postcards', '/roll-stock-labels', '/feather-flags', '/laminated-items',
  '/exterior-signage', '/interior-exterior-signage', '/window-graphics',
  '/tradeshow-booths', '/other-event-items', '/acrylic-wall-signs',
  '/custom-laser-cuts', '/contractors', '/breweries',
  '/professional-services', '/print-sign-shop', '/technical-campaigns',
  '/blog/restaurant-menu-design-importance',
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 410 Gone for dead PHP/WooCommerce/print-shop paths ──────
  const cleanPath = pathname.replace(/\/+$/, '') || '/'
  if (DEAD_PREFIXES.some(p => pathname.startsWith(p)) || DEAD_SLUGS.has(cleanPath)) {
    return new NextResponse('Gone', { status: 410 })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  // Expose the query string to server components/layouts (which don't receive
  // searchParams). Used e.g. by the prospect layout to honor ?keepView=1.
  requestHeaders.set('x-search', request.nextUrl.search)

  // ============================================================
  // ADMIN ROUTE PROTECTION
  // ============================================================
  // Allow auth callback and login page through without auth check
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // ============================================================
  // PORTAL ROUTE PROTECTION
  // ============================================================
  // /portal/* and /api/portal/* run on the SAME Supabase Auth
  // session as /admin/*. There is one Google OAuth flow at
  // /login. Role resolution (admin/client/both) happens at
  // request time inside route handlers via portal-session.ts —
  // middleware only verifies that A session exists. If not,
  // redirect to /login.
  const isPortalPage = pathname.startsWith('/portal')
  const isPortalApi = pathname.startsWith('/api/portal/')
  if (isPortalPage || isPortalApi) {
    // Single response — supabase mutates this object directly via
    // setAll() so refreshed session cookies are preserved into the
    // downstream request. (Reassigning `response` inside setAll loses
    // earlier writes when getUser triggers a token refresh.)
    const response = NextResponse.next({ request: { headers: requestHeaders } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (isPortalApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  }

  if (pathname.startsWith('/admin')) {
    // Single response — supabase writes session cookies directly via
    // setAll(). Same fix as the portal block above.
    const response = NextResponse.next({ request: { headers: requestHeaders } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // (Dead — pathname can't both startsWith('/admin') AND === '/login'.
    // Left as a no-op safety net.)
    if (pathname === '/login') {
      return response
    }

    // No session at all → redirect to login
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check admin_users table — blocks random Google accounts from seeing admin UI
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!admin) {
      // User is authenticated but NOT an admin — redirect to deterrent page
      // Don't sign out yet — the /unauthorized page needs the session to read their profile
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return response
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

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
    '/admin/:path*',
    '/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|webmanifest|xml|txt)).*)',
  ],
}
