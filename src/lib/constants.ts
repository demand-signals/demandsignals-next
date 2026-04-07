export const SITE_NAME = 'Demand Signals'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'
export const CONTACT_EMAIL = 'DemandSignals@gmail.com'
export const CONTACT_PHONE = '(916) 542-2423'
export const CONTACT_PHONE_TEL = '+19165422423'
export const BOOKING_URL =
  'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true'
export const LOGO_URL =
  '/logo.png'

// ── Social profiles ──────────────────────────────────────────
export const SOCIAL_LINKS = {
  twitter:   'https://x.com/DemandSignalsCo',
  instagram: 'https://www.instagram.com/DemandSignalsAgency',
  facebook:  'https://www.facebook.com/DemandSignals/',
  tiktok:    'https://www.tiktok.com/@demandsignals',
  youtube:   'https://www.youtube.com/@DemandSignals',
  pinterest: 'https://www.pinterest.com/demandsignals/',
  linkedin:  'https://www.linkedin.com/company/demandsignals',
}

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
  { icon: '👤', label: 'Our Teams',          desc: 'The people & AI behind Demand Signals',          href: '/team' },
  { icon: '📰', label: 'Blog & News',        desc: 'Insights on AI marketing & demand generation',   href: '/blog'      },
  { icon: '📍', label: 'Service Locations',  desc: 'Counties & cities we serve across NorCal',       href: '/locations'  },
  { icon: '🖼️', label: 'Portfolio',          desc: 'Client work & case studies',                     href: '/portfolio'  },
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
  { label: 'El Dorado Hills',   href: '/locations/el-dorado-county/el-dorado-hills' },
  { label: 'Folsom',            href: '/locations/sacramento-county/folsom' },
  { label: 'Sacramento',        href: '/locations/sacramento-county/sacramento' },
  { label: 'Placerville',       href: '/locations/el-dorado-county/placerville' },
  { label: 'Roseville',         href: '/locations/placer-county/roseville' },
  { label: 'Rocklin',           href: '/locations/placer-county/rocklin' },
  { label: 'Granite Bay',       href: '/locations/placer-county/granite-bay' },
  { label: 'Auburn',            href: '/locations/placer-county/auburn' },
  { label: 'Citrus Heights',    href: '/locations/sacramento-county/citrus-heights' },
  { label: 'Cameron Park',      href: '/locations/el-dorado-county/cameron-park' },
  { label: 'South Lake Tahoe',  href: '/locations/el-dorado-county/south-lake-tahoe' },
  { label: 'All Locations',     href: '/locations' },
]
