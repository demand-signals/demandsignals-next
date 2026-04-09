import { getAllPosts } from '@/lib/blog'
import { SERVICES } from '@/lib/services'
import { feedHeaders, checkConditional, SITE_URL } from '@/lib/feed-utils'

export async function GET(request: Request) {
  const posts = getAllPosts()
  const serviceSlugs = SERVICES.map(s => s.slug)

  const data = {
    name: 'Demand Signals Content API',
    description: 'Machine-readable content endpoints for AI agents and LLM crawlers',
    version: '1.0.0',
    base_url: SITE_URL,
    last_updated: new Date().toISOString(),
    endpoints: {
      feeds: {
        rss: '/feed.xml',
        atom: '/atom.xml',
        json_feed: '/feed.json',
      },
      markdown: {
        master_faq: '/faqs.md',
        services_directory: '/feeds/services.md',
        blog_index: '/feeds/blog.md',
        locations_directory: '/feeds/locations.md',
        about: '/feeds/about',
        services: {
          pattern: '/feeds/services/{slug}',
          count: SERVICES.length,
          slugs: serviceSlugs,
        },
        blog_posts: {
          pattern: '/feeds/blog/{slug}',
          count: posts.length,
          note: 'Use blog index at /feeds/blog.md for full post listing',
        },
        categories: {
          pattern: '/feeds/categories/{slug}',
          count: 4,
          slugs: ['websites-apps', 'demand-generation', 'content-social', 'ai-services'],
        },
        pages: {
          home: '/feeds/pages/home',
          contact: '/feeds/pages/contact',
          portfolio: '/feeds/pages/portfolio',
          team: '/feeds/pages/team',
          terms: '/feeds/pages/terms',
          privacy: '/feeds/pages/privacy',
          accessibility: '/feeds/pages/accessibility',
          tools_index: '/feeds/pages/tools',
          tools: {
            pattern: '/feeds/pages/tools/{slug}',
            count: 4,
            slugs: ['demand-audit', 'research-reports', 'demand-links', 'dynamic-qr'],
          },
        },
        locations: {
          index: '/feeds/locations',
          counties: {
            pattern: '/feeds/locations/{county}',
            count: 5,
            slugs: ['el-dorado-county', 'sacramento-county', 'placer-county', 'amador-county', 'nevada-county'],
          },
          cities: {
            pattern: '/feeds/locations/{county}/{city}',
            count: 23,
            note: 'Use locations directory at /feeds/locations.md for full listing',
          },
          ltp_pages: {
            pattern: '/feeds/ltp/{city-service}',
            count: 529,
            note: 'Long-tail pages: city + service combinations (e.g., el-dorado-hills-wordpress-development)',
          },
        },
      },
      llm_discovery: {
        llms_txt: '/llms.txt',
        llms_full_txt: '/llms-full.txt',
      },
      structured_data: {
        sitemap: '/sitemap.xml',
        robots: '/robots.txt',
        opensearch: '/opensearch.xml',
      },
      security: {
        security_txt: '/.well-known/security.txt',
      },
    },
    detail_levels: {
      description: 'Markdown endpoints accept ?detail=summary or ?detail=full (default)',
      summary: 'Title, description, URL \u2014 ~100 tokens per item',
      full: 'Complete content with features, FAQs, cross-links',
    },
    http_headers: {
      description: 'HTML pages include Link headers pointing to markdown versions',
      example: 'Link: </feeds/services/wordpress-development>; rel=alternate; type=text/markdown',
    },
  }

  const json = JSON.stringify(data, null, 2)

  const conditional = checkConditional(request, json)
  if (conditional) return conditional

  return new Response(json, {
    status: 200,
    headers: feedHeaders('application/json', json),
  })
}
