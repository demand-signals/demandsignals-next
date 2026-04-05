export const SITE_NAME = 'Demand Signals'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'
export const CONTACT_EMAIL = 'DemandSignals@gmail.com'
export const CONTACT_PHONE = '916-542-2423'
export const BOOKING_URL =
  'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true'
export const LOGO_URL =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a7735995dcd2da251c8bf7/efdd5a396_dsig_q2y25_logo_v2b.png'
export const HERO_VIDEO_URL =
  'https://base44.app/api/apps/68ccebd683c4aa87ed81a043/files/public/68ccebd683c4aa87ed81a043/d76594fa5_demand_signals_penguines_shity_one_v1a.mp4'

// ── Services dropdown ────────────────────────────────────────
export const NAV_SERVICES = [
  { icon: '🏢', label: 'WordPress Sites',         desc: 'Custom themes, WooCommerce, AI content pipelines',    href: '/services/wordpress'      },
  { icon: '⚡', label: 'React / Next.js WebApps', desc: 'Full-stack apps with AI features & edge deployment',  href: '/services/nextjs-webapps' },
  { icon: '🤖', label: 'Vibe Coded WebApps',      desc: 'Ship in days with Cursor, Claude Code & Base44',      href: '/services/vibe-coded'     },
  { icon: '📱', label: 'iOS & Android Apps',      desc: 'React Native cross-platform, App Store ready',        href: '/services/mobile-apps'    },
  { icon: '🎨', label: 'UI/UX Design',            desc: 'Figma systems, AI prototyping, dev-ready handoff',    href: '/services/ui-ux-design'   },
  { icon: '📍', label: 'Local Demand Generation', desc: 'SEO, GBP, citations & Map Pack domination',           href: '/services/local-demand'   },
  { icon: '🔮', label: 'GEO & Generative Search', desc: 'Appear in ChatGPT, Gemini & Perplexity results',      href: '/ai-agents/geo-llm'       },
  { icon: '✍️', label: 'Content Marketing',       desc: 'AI agents publishing city-targeted content daily',    href: '/services/content'        },
]

export const NAV_AI_AGENTS = [
  { icon: '🤖', label: 'AI Agent Farms',          desc: 'Networks of agents handling marketing ops 24/7',      href: '/ai-agents/agent-farms'    },
  { icon: '🎙️', label: 'AI Voice Systems',        desc: 'Inbound call handling & appointment booking',         href: '/ai-agents/voice'          },
  { icon: '⚙️', label: 'Workflow Automation',     desc: 'End-to-end business process automation',              href: '/ai-agents/automation'     },
  { icon: '📧', label: 'AI-Powered Outreach',     desc: 'Personalized prospecting & lead routing at scale',    href: '/ai-agents/outreach'       },
  { icon: '🔮', label: 'GEO & LLM Optimization',  desc: 'Structured data & entity signals for AI search',      href: '/ai-agents/geo-llm'        },
  { icon: '🏗️', label: 'Agent Infrastructure',    desc: 'The systems powering automated marketing ops',        href: '/ai-agents/infrastructure' },
]

export const NAV_TOOLS = [
  { icon: '🔍', label: 'Free Demand Audit',    desc: 'See where competitors are beating you — instantly', href: '/tools/demand-audit',     badge: 'Free' },
  { icon: '📊', label: 'Intelligence Reports', desc: 'Market intel reports for NorCal businesses',        href: '/tools/research-reports', badge: 'Free' },
  { icon: '🔗', label: 'Demand Links',         desc: 'Smart link management & tracking',                  href: '/tools/demand-links',     badge: 'Soon' },
  { icon: '📱', label: 'Dynamic QR Codes',     desc: 'Trackable QR codes with live destinations',         href: '/tools/dynamic-qr',       badge: 'Soon' },
]

// Legacy aliases kept for any existing imports
export const NAV_WEBSITES  = NAV_SERVICES
export const NAV_DEMAND    = NAV_SERVICES
export const NAV_CONTENT   = NAV_SERVICES
export const NAV_ABOUT     = [
  { label: 'About Us',          href: '/about'     },
  { label: 'Portfolio',         href: '/portfolio' },
  { label: 'Blog',              href: '/blog'      },
  { label: 'Service Locations', href: '/locations' },
]

export const NAV_LOCATIONS = [
  { label: 'El Dorado Hills',   href: '/locations/el-dorado-hills' },
  { label: 'Folsom',            href: '/locations/folsom' },
  { label: 'Sacramento',        href: '/locations/sacramento' },
  { label: 'Placerville',       href: '/locations/placerville' },
  { label: 'Roseville',         href: '/locations/roseville' },
  { label: 'Rocklin',           href: '/locations/rocklin' },
  { label: 'Granite Bay',       href: '/locations/granite-bay' },
  { label: 'Auburn',            href: '/locations/auburn' },
  { label: 'Citrus Heights',    href: '/locations/citrus-heights' },
  { label: 'Cameron Park',      href: '/locations/cameron-park' },
  { label: 'South Lake Tahoe',  href: '/locations/south-lake-tahoe' },
  { label: 'All Locations',     href: '/locations' },
]
