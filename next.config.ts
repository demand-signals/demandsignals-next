import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'demandsignals.us' },
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
        ],
      },
    ]
  },
}

export default nextConfig
