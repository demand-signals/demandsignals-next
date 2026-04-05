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

export const NAV_SERVICES = [
  { label: 'Websites & Web Apps',     href: '/services/websites',     icon: '🏢' },
  { label: 'Local Demand Generation', href: '/services/local-demand', icon: '📍' },
  { label: 'GEO & Generative Search', href: '/ai-agents/geo-llm',     icon: '🔮' },
  { label: 'Content Marketing',       href: '/services/content',      icon: '✍️' },
  { label: 'Google My Business',      href: '/services/gmb',          icon: '⭐' },
  { label: 'Brand Identity & Design', href: '/services/brand-design', icon: '🎨' },
]

export const NAV_AI = [
  { label: 'AI Agent Farms',        href: '/ai-agents/agent-farms',    icon: '🤖' },
  { label: 'AI Voice Systems',      href: '/ai-agents/voice',          icon: '📞' },
  { label: 'Workflow Automation',   href: '/ai-agents/automation',     icon: '⚡' },
  { label: 'AI-Powered Outreach',   href: '/ai-agents/outreach',       icon: '🎯' },
  { label: 'GEO & LLM Optimization',href: '/ai-agents/geo-llm',        icon: '🔮' },
  { label: 'Agent Infrastructure',  href: '/ai-agents/infrastructure', icon: '🔧' },
]

export const NAV_TOOLS = [
  { label: 'Free Demand Audit',   href: '/tools/demand-audit',      icon: '📊', badge: 'Free' },
  { label: 'Intelligence Reports',href: '/tools/research-reports',  icon: '📋', badge: 'Free' },
  { label: 'Demand Links',        href: '/tools/demand-links',       icon: '🔗', badge: 'Soon' },
  { label: 'Dynamic QR Codes',    href: '/tools/dynamic-qr',         icon: '📱', badge: 'Soon' },
]
