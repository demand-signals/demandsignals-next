/**
 * Analytics Database Helpers
 *
 * Uses Vercel Postgres to store pageview data collected by our
 * lightweight tracker. No cookies, no third-party JS, full data ownership.
 *
 * Required env var: POSTGRES_URL (auto-set when Vercel Postgres is added to project)
 */

import { sql } from '@vercel/postgres'
import { createHash } from 'crypto'

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS pageviews (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      path VARCHAR(500) NOT NULL,
      referrer VARCHAR(1000),
      referrer_domain VARCHAR(500),
      utm_source VARCHAR(200),
      utm_medium VARCHAR(200),
      utm_campaign VARCHAR(200),
      utm_term VARCHAR(200),
      utm_content VARCHAR(200),
      country VARCHAR(5),
      region VARCHAR(100),
      city VARCHAR(200),
      device_type VARCHAR(20),
      browser VARCHAR(100),
      os VARCHAR(100),
      screen_width INT,
      screen_height INT,
      visitor_hash VARCHAR(64),
      is_bot BOOLEAN DEFAULT FALSE
    )
  `

  // Indexes for efficient weekly report queries
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_created ON pageviews(created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_path ON pageviews(path)`
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_visitor ON pageviews(visitor_hash)`
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_referrer ON pageviews(referrer_domain)`
}

/* ------------------------------------------------------------------ */
/*  Insert                                                             */
/* ------------------------------------------------------------------ */

export interface PageviewData {
  path: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  screenWidth?: number
  screenHeight?: number
  // Server-side enrichment
  ip?: string
  userAgent?: string
  country?: string
  region?: string
  city?: string
}

const BOT_PATTERNS = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduck|facebot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|perplexity/i

function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
  let browser = 'Unknown'
  let os = 'Unknown'
  let deviceType = 'desktop'

  // Browser detection
  if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera'
  else if (ua.includes('Chrome/') && ua.includes('Safari/')) browser = 'Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'IE'

  // OS detection
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('CrOS')) os = 'ChromeOS'

  // Device type
  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) deviceType = 'mobile'
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet'

  return { browser, os, deviceType }
}

function extractDomain(referrer: string): string | null {
  if (!referrer) return null
  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Generate a daily visitor hash from IP + UA + daily salt.
 * Changes every day so we can count daily unique visitors
 * without storing any PII.
 */
function visitorHash(ip: string, ua: string): string {
  const daySalt = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return createHash('sha256')
    .update(`${ip}:${ua}:${daySalt}:dsig-analytics`)
    .digest('hex')
}

export async function insertPageview(data: PageviewData) {
  const ua = data.userAgent || ''
  const isBot = BOT_PATTERNS.test(ua)
  const { browser, os, deviceType } = parseUserAgent(ua)
  const refDomain = extractDomain(data.referrer || '')
  const hash = data.ip ? visitorHash(data.ip, ua) : null

  // Filter out our own feeds/markdown endpoints and admin pages
  if (data.path.startsWith('/feeds/') || data.path.startsWith('/api/')) return
  if (data.path.startsWith('/admin')) return
  if (data.path.endsWith('.xml') || data.path.endsWith('.json') || data.path.endsWith('.txt')) return

  await sql`
    INSERT INTO pageviews (
      path, referrer, referrer_domain,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      country, region, city,
      device_type, browser, os,
      screen_width, screen_height,
      visitor_hash, is_bot
    ) VALUES (
      ${data.path},
      ${data.referrer || null},
      ${refDomain},
      ${data.utmSource || null},
      ${data.utmMedium || null},
      ${data.utmCampaign || null},
      ${data.utmTerm || null},
      ${data.utmContent || null},
      ${data.country || null},
      ${data.region || null},
      ${data.city || null},
      ${deviceType},
      ${browser},
      ${os},
      ${data.screenWidth || null},
      ${data.screenHeight || null},
      ${hash},
      ${isBot}
    )
  `
}

/* ------------------------------------------------------------------ */
/*  Query helpers for weekly report                                    */
/* ------------------------------------------------------------------ */

export interface WeeklyReport {
  period: { from: string; to: string }
  totalPageviews: number
  uniqueVisitors: number
  prevPageviews: number
  prevUniqueVisitors: number
  topPages: { path: string; views: number; visitors: number }[]
  topReferrers: { domain: string; views: number }[]
  topCountries: { country: string; views: number }[]
  devices: { type: string; count: number; pct: number }[]
  browsers: { name: string; count: number; pct: number }[]
  osSystems: { name: string; count: number; pct: number }[]
  dailyTrend: { date: string; views: number; visitors: number }[]
  topUtmSources: { source: string; medium: string; views: number }[]
  botPageviews: number
}

export async function getWeeklyReport(): Promise<WeeklyReport> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const from = weekAgo.toISOString()
  const to = now.toISOString()
  const prevFrom = twoWeeksAgo.toISOString()

  // Total pageviews (non-bot) — this week
  const { rows: [pvRow] } = await sql`
    SELECT COUNT(*) as count FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
  `

  // Unique visitors — this week
  const { rows: [uvRow] } = await sql`
    SELECT COUNT(DISTINCT visitor_hash) as count FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false AND visitor_hash IS NOT NULL
  `

  // Previous week for comparison
  const { rows: [prevPvRow] } = await sql`
    SELECT COUNT(*) as count FROM pageviews
    WHERE created_at >= ${prevFrom} AND created_at < ${from} AND is_bot = false
  `
  const { rows: [prevUvRow] } = await sql`
    SELECT COUNT(DISTINCT visitor_hash) as count FROM pageviews
    WHERE created_at >= ${prevFrom} AND created_at < ${from} AND is_bot = false AND visitor_hash IS NOT NULL
  `

  // Bot pageviews
  const { rows: [botRow] } = await sql`
    SELECT COUNT(*) as count FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = true
  `

  // Top 20 pages
  const { rows: topPages } = await sql`
    SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
    GROUP BY path ORDER BY views DESC LIMIT 20
  `

  // Top 15 referrer domains
  const { rows: topReferrers } = await sql`
    SELECT referrer_domain as domain, COUNT(*) as views
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
      AND referrer_domain IS NOT NULL AND referrer_domain != 'demandsignals.co'
    GROUP BY referrer_domain ORDER BY views DESC LIMIT 15
  `

  // Top 10 countries
  const { rows: topCountries } = await sql`
    SELECT country, COUNT(*) as views
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false AND country IS NOT NULL
    GROUP BY country ORDER BY views DESC LIMIT 10
  `

  // Device breakdown
  const { rows: devicesRaw } = await sql`
    SELECT device_type as type, COUNT(*) as count
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
    GROUP BY device_type ORDER BY count DESC
  `
  const totalDevices = devicesRaw.reduce((s, r) => s + Number(r.count), 0)
  const devices = devicesRaw.map(r => ({
    type: r.type, count: Number(r.count),
    pct: totalDevices > 0 ? Math.round((Number(r.count) / totalDevices) * 100) : 0,
  }))

  // Browser breakdown
  const { rows: browsersRaw } = await sql`
    SELECT browser as name, COUNT(*) as count
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
    GROUP BY browser ORDER BY count DESC LIMIT 8
  `
  const totalBrowsers = browsersRaw.reduce((s, r) => s + Number(r.count), 0)
  const browsers = browsersRaw.map(r => ({
    name: r.name, count: Number(r.count),
    pct: totalBrowsers > 0 ? Math.round((Number(r.count) / totalBrowsers) * 100) : 0,
  }))

  // OS breakdown
  const { rows: osRaw } = await sql`
    SELECT os as name, COUNT(*) as count
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
    GROUP BY os ORDER BY count DESC LIMIT 8
  `
  const totalOs = osRaw.reduce((s, r) => s + Number(r.count), 0)
  const osSystems = osRaw.map(r => ({
    name: r.name, count: Number(r.count),
    pct: totalOs > 0 ? Math.round((Number(r.count) / totalOs) * 100) : 0,
  }))

  // Daily trend (7 days)
  const { rows: dailyRaw } = await sql`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as views,
      COUNT(DISTINCT visitor_hash) as visitors
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
    GROUP BY DATE(created_at) ORDER BY date ASC
  `
  const dailyTrend = dailyRaw.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    views: Number(r.views),
    visitors: Number(r.visitors),
  }))

  // Top UTM sources
  const { rows: utmRaw } = await sql`
    SELECT utm_source as source, utm_medium as medium, COUNT(*) as views
    FROM pageviews
    WHERE created_at >= ${from} AND created_at < ${to} AND is_bot = false
      AND utm_source IS NOT NULL
    GROUP BY utm_source, utm_medium ORDER BY views DESC LIMIT 10
  `

  return {
    period: {
      from: weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      to: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    totalPageviews: Number(pvRow.count),
    uniqueVisitors: Number(uvRow.count),
    prevPageviews: Number(prevPvRow.count),
    prevUniqueVisitors: Number(prevUvRow.count),
    topPages: topPages.map(r => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) })),
    topReferrers: topReferrers.map(r => ({ domain: r.domain, views: Number(r.views) })),
    topCountries: topCountries.map(r => ({ country: r.country, views: Number(r.views) })),
    devices,
    browsers,
    osSystems,
    dailyTrend,
    topUtmSources: utmRaw.map(r => ({ source: r.source, medium: r.medium || 'direct', views: Number(r.views) })),
    botPageviews: Number(botRow.count),
  }
}
