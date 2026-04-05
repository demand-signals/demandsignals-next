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

// ── Nav item type ─────────────────────────────────────────────
export type NavItem = {
  icon?: string
  label: string
  desc?: string
  href: string
  badge?: string
}

// ── Websites & Apps dropdown ──────────────────────────────────
export const NAV_WEBSITES_APPS: NavItem[] = [
  { icon: '🏢', label: 'WordPress Sites',         desc: 'Custom themes, WooCommerce, AI content pipelines',   href: '/websites-apps/wordpress-development' },
  { icon: '⚡', label: 'React / Next.js Apps',    desc: 'Full-stack apps with AI features & edge deployment', href: '/websites-apps/react-next-webapps'    },
  { icon: '📱', label: 'iOS & Android Apps',      desc: 'React Native cross-platform, App Store ready',       href: '/websites-apps/mobile-apps'           },
  { icon: '🤖', label: 'Vibe Coded Web Apps',     desc: 'Ship in days with Cursor, Claude Code & Base44',     href: '/websites-apps/vibe-coded'            },
  { icon: '🎨', label: 'UI/UX Design',            desc: 'Figma systems, AI prototyping, dev-ready handoff',   href: '/websites-apps/design'                },
  { icon: '🖥️', label: 'Agent & App Hosting',     desc: 'Vercel, Cloudflare & managed infrastructure',        href: '/websites-apps/hosting'               },
]

// ── Demand Generation dropdown ────────────────────────────────
export const NAV_DEMAND_GEN: NavItem[] = [
  { icon: '🔮', label: 'LLM Optimization',        desc: 'Get cited by ChatGPT, Perplexity & Gemini',         href: '/demand-generation/geo-aeo-llm-optimization' },
  { icon: '📍', label: 'Local SEO',               desc: 'Dominate your local market in organic search',       href: '/demand-generation/local-seo'                },
  { icon: '🎯', label: 'Geo-Targeting',           desc: 'Hyper-local targeting across counties & cities',     href: '/demand-generation/geo-targeting'             },
  { icon: '📌', label: 'Google Business Admin',   desc: 'GBP optimization, posts, Q&A & Map Pack',           href: '/demand-generation/gbp-admin'                },
  { icon: '⚙️', label: 'Demand Gen Systems',      desc: 'Full-stack pipelines that generate leads 24/7',      href: '/demand-generation/systems'                  },
]

// ── Content & Social dropdown ─────────────────────────────────
export const NAV_CONTENT_SOCIAL: NavItem[] = [
  { icon: '✍️', label: 'AI Content Generation',       desc: 'GEO-first content built to rank & get cited',         href: '/content-social/ai-content-generation'       },
  { icon: '📣', label: 'AI Social Media Management',  desc: 'Automated posting across every platform',             href: '/content-social/ai-social-media-management'  },
  { icon: '⭐', label: 'AI Review Auto Responders',   desc: 'Every review handled within hours, automatically',    href: '/content-social/ai-review-auto-responders'   },
  { icon: '📝', label: 'AI Auto Blogging',            desc: 'Weekly blog content targeting buyer search terms',     href: '/content-social/ai-auto-blogging'             },
  { icon: '🔄', label: 'AI Content Republishing',     desc: 'Repurpose content across channels automatically',     href: '/content-social/ai-content-repurposing'       },
]

// ── AI & Agent Services dropdown ──────────────────────────────
export const NAV_AI_SERVICES: NavItem[] = [
  { icon: '🧠', label: 'AI Adoption Strategies',     desc: 'Roadmaps to integrate AI across your business',      href: '/ai-services/ai-automation-strategies'   },
  { icon: '👥', label: 'AI Workforce Automation',     desc: 'Replace manual roles with AI systems',               href: '/ai-services/ai-workforce-automation'    },
  { icon: '🏗️', label: 'AI Infrastructure',           desc: 'The systems powering automated operations',          href: '/ai-services/ai-agent-infrastructure'    },
  { icon: '📧', label: 'AI Powered Outreach',         desc: 'Personalized prospecting & lead routing at scale',   href: '/ai-services/ai-automated-outreach'      },
  { icon: '🐝', label: 'AI Agent Swarms',             desc: 'Networks of agents handling operations 24/7',        href: '/ai-services/ai-agent-swarms'            },
  { icon: '🔒', label: 'AI Private LLMs',             desc: 'Self-hosted models for sensitive business data',     href: '/ai-services/private-llms'               },
  { icon: '🕷️', label: 'AI Clawbot Setup',            desc: 'Intelligent web crawlers for data & research',       href: '/ai-services/clawbot-setup'              },
]

// ── Learn dropdown ────────────────────────────────────────────
export const NAV_LEARN: NavItem[] = [
  { icon: '🏢', label: 'Company',            desc: 'Our story, mission & what drives us',            href: '/about'     },
  { icon: '👤', label: 'Our Teams',          desc: 'The people & AI behind Demand Signals',          href: '/about/team' },
  { icon: '📰', label: 'Blog & News',        desc: 'Insights on AI marketing & demand generation',   href: '/blog'      },
  { icon: '📍', label: 'Service Locations',  desc: 'Counties & cities we serve across NorCal',       href: '/locations'  },
]

// ── Tools (keep as standalone nav link, not dropdown) ─────────
export const NAV_TOOLS: NavItem[] = [
  { icon: '🔍', label: 'Free Demand Audit',    desc: 'See where competitors are beating you — instantly', href: '/tools/demand-audit',     badge: 'Free' },
  { icon: '📊', label: 'Intelligence Reports', desc: 'Market intel reports for NorCal businesses',        href: '/tools/research-reports', badge: 'Free' },
  { icon: '🔗', label: 'Demand Links',         desc: 'Smart link management & tracking',                  href: '/tools/demand-links',     badge: 'Soon' },
  { icon: '📱', label: 'Dynamic QR Codes',     desc: 'Trackable QR codes with live destinations',         href: '/tools/dynamic-qr',       badge: 'Soon' },
]

// ── Legacy aliases (prevent import breaks during migration) ───
export const NAV_SERVICES   = NAV_WEBSITES_APPS
export const NAV_AI_AGENTS  = NAV_AI_SERVICES

// ── Location data ─────────────────────────────────────────────
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
