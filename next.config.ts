import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'demandsignals.us' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
  async redirects() {
    return [
      // Old service URLs → new structure
      { source: '/services/wordpress',      destination: '/websites-apps/wordpress-development',           permanent: true },
      { source: '/services/nextjs-webapps', destination: '/websites-apps/react-next-webapps',              permanent: true },
      { source: '/services/vibe-coded',     destination: '/websites-apps/vibe-coded',                      permanent: true },
      { source: '/services/mobile-apps',    destination: '/websites-apps/mobile-apps',                     permanent: true },
      { source: '/services/ui-ux-design',   destination: '/websites-apps/design',                          permanent: true },
      { source: '/services/websites',       destination: '/websites-apps',                                 permanent: true },
      { source: '/services/local-demand',   destination: '/demand-generation/local-seo',                   permanent: true },
      { source: '/services/content',        destination: '/content-social/ai-content-generation',          permanent: true },
      { source: '/services',                destination: '/websites-apps',                                 permanent: true },
      // Old AI agent URLs → new structure
      { source: '/ai-agents/geo-llm',       destination: '/demand-generation/geo-aeo-llm-optimization',   permanent: true },
      { source: '/ai-agents/agent-farms',   destination: '/ai-services/ai-agent-swarms',                  permanent: true },
      { source: '/ai-agents/automation',    destination: '/ai-services/ai-workforce-automation',           permanent: true },
      { source: '/ai-agents/outreach',      destination: '/ai-services/ai-automated-outreach',            permanent: true },
      { source: '/ai-agents/infrastructure',destination: '/ai-services/ai-agent-infrastructure',          permanent: true },
      { source: '/ai-agents/voice',         destination: '/ai-services/ai-automation-strategies',          permanent: true },
      { source: '/ai-agents',               destination: '/ai-services',                                  permanent: true },
      // Old /locations/{city} → new /locations/{county}/{city}
      // El Dorado County
      { source: '/locations/el-dorado-hills',   destination: '/locations/el-dorado-county/el-dorado-hills',   permanent: true },
      { source: '/locations/cameron-park',      destination: '/locations/el-dorado-county/cameron-park',      permanent: true },
      { source: '/locations/placerville',       destination: '/locations/el-dorado-county/placerville',       permanent: true },
      { source: '/locations/shingle-springs',   destination: '/locations/el-dorado-county/shingle-springs',   permanent: true },
      { source: '/locations/south-lake-tahoe',  destination: '/locations/el-dorado-county/south-lake-tahoe',  permanent: true },
      // Sacramento County
      { source: '/locations/sacramento',        destination: '/locations/sacramento-county/sacramento',       permanent: true },
      { source: '/locations/folsom',            destination: '/locations/sacramento-county/folsom',           permanent: true },
      { source: '/locations/elk-grove',         destination: '/locations/sacramento-county/elk-grove',        permanent: true },
      { source: '/locations/citrus-heights',    destination: '/locations/sacramento-county/citrus-heights',   permanent: true },
      { source: '/locations/rancho-cordova',    destination: '/locations/sacramento-county/rancho-cordova',   permanent: true },
      // Placer County
      { source: '/locations/roseville',         destination: '/locations/placer-county/roseville',            permanent: true },
      { source: '/locations/rocklin',           destination: '/locations/placer-county/rocklin',              permanent: true },
      { source: '/locations/granite-bay',       destination: '/locations/placer-county/granite-bay',          permanent: true },
      { source: '/locations/auburn',            destination: '/locations/placer-county/auburn',               permanent: true },
      { source: '/locations/lincoln',           destination: '/locations/placer-county/lincoln',              permanent: true },
      // Amador County
      { source: '/locations/jackson',           destination: '/locations/amador-county/jackson',              permanent: true },
      { source: '/locations/sutter-creek',      destination: '/locations/amador-county/sutter-creek',         permanent: true },
      { source: '/locations/pine-grove',        destination: '/locations/amador-county/pine-grove',           permanent: true },
      { source: '/locations/ione',              destination: '/locations/amador-county/ione',                 permanent: true },
      // Nevada County
      { source: '/locations/grass-valley',      destination: '/locations/nevada-county/grass-valley',         permanent: true },
      { source: '/locations/nevada-city',       destination: '/locations/nevada-county/nevada-city',          permanent: true },
      { source: '/locations/truckee',           destination: '/locations/nevada-county/truckee',              permanent: true },
      { source: '/locations/penn-valley',       destination: '/locations/nevada-county/penn-valley',          permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://vercel.live https://*.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'self' https://calendar.google.com https://www.google.com https://vercel.live; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
    ]
  },
}

export default nextConfig
