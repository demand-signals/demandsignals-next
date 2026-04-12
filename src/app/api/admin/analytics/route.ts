import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sql } from '@vercel/postgres'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const from = searchParams.get('from') || defaultFrom.toISOString().slice(0, 10)
  const to = searchParams.get('to') || now.toISOString().slice(0, 10)

  const fromDate = `${from}T00:00:00Z`
  const toDate = `${to}T23:59:59Z`

  // Calculate previous period for comparison
  const fromMs = new Date(fromDate).getTime()
  const toMs = new Date(toDate).getTime()
  const periodMs = toMs - fromMs
  const prevFrom = new Date(fromMs - periodMs).toISOString()
  const prevTo = fromDate

  try {
    // Check if table exists first
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'pageviews'
      ) as exists
    `
    if (!tableCheck[0]?.exists) {
      return NextResponse.json({
        empty: true,
        period: { from, to },
        totalPageviews: 0,
        uniqueVisitors: 0,
        prevPageviews: 0,
        prevUniqueVisitors: 0,
        botPageviews: 0,
        topPages: [],
        topReferrers: [],
        topCountries: [],
        topCities: [],
        devices: [],
        browsers: [],
        osSystems: [],
        dailyTrend: [],
        utmCampaigns: [],
      })
    }

    // Run all queries in parallel
    const [
      pvResult, uvResult, prevPvResult, prevUvResult, botResult,
      topPagesResult, topReferrersResult, topCountriesResult, topCitiesResult,
      devicesResult, browsersResult, osResult, dailyResult, utmResult,
    ] = await Promise.all([
      // Total pageviews
      sql`SELECT COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false`,
      // Unique visitors
      sql`SELECT COUNT(DISTINCT visitor_hash) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND visitor_hash IS NOT NULL`,
      // Previous period pageviews
      sql`SELECT COUNT(*) as count FROM pageviews WHERE created_at >= ${prevFrom} AND created_at < ${fromDate} AND is_bot = false`,
      // Previous period unique visitors
      sql`SELECT COUNT(DISTINCT visitor_hash) as count FROM pageviews WHERE created_at >= ${prevFrom} AND created_at < ${fromDate} AND is_bot = false AND visitor_hash IS NOT NULL`,
      // Bot count
      sql`SELECT COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = true`,
      // Top pages
      sql`SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY path ORDER BY views DESC LIMIT 30`,
      // Top referrers
      sql`SELECT referrer_domain as domain, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND referrer_domain IS NOT NULL AND referrer_domain != 'demandsignals.co' GROUP BY referrer_domain ORDER BY views DESC LIMIT 15`,
      // Top countries
      sql`SELECT country, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND country IS NOT NULL GROUP BY country ORDER BY views DESC LIMIT 10`,
      // Top cities
      sql`SELECT city, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND city IS NOT NULL GROUP BY city ORDER BY views DESC LIMIT 10`,
      // Devices
      sql`SELECT device_type as type, COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY device_type ORDER BY count DESC`,
      // Browsers
      sql`SELECT browser as name, COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY browser ORDER BY count DESC LIMIT 8`,
      // OS
      sql`SELECT os as name, COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY os ORDER BY count DESC LIMIT 8`,
      // Daily trend
      sql`SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY DATE(created_at) ORDER BY date ASC`,
      // UTM campaigns
      sql`SELECT utm_source as source, utm_medium as medium, utm_campaign as campaign, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND utm_source IS NOT NULL GROUP BY utm_source, utm_medium, utm_campaign ORDER BY views DESC LIMIT 10`,
    ])

    const totalPv = Number(pvResult.rows[0]?.count ?? 0)
    const totalDevices = devicesResult.rows.reduce((s, r) => s + Number(r.count), 0)
    const totalBrowsers = browsersResult.rows.reduce((s, r) => s + Number(r.count), 0)
    const totalOs = osResult.rows.reduce((s, r) => s + Number(r.count), 0)

    return NextResponse.json({
      period: { from, to },
      totalPageviews: totalPv,
      uniqueVisitors: Number(uvResult.rows[0]?.count ?? 0),
      prevPageviews: Number(prevPvResult.rows[0]?.count ?? 0),
      prevUniqueVisitors: Number(prevUvResult.rows[0]?.count ?? 0),
      botPageviews: Number(botResult.rows[0]?.count ?? 0),
      topPages: topPagesResult.rows.map(r => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) })),
      topReferrers: topReferrersResult.rows.map(r => ({ domain: r.domain, views: Number(r.views) })),
      topCountries: topCountriesResult.rows.map(r => ({ country: r.country, views: Number(r.views) })),
      topCities: topCitiesResult.rows.map(r => ({ city: r.city, views: Number(r.views) })),
      devices: devicesResult.rows.map(r => ({ type: r.type, count: Number(r.count), pct: totalDevices > 0 ? Math.round((Number(r.count) / totalDevices) * 100) : 0 })),
      browsers: browsersResult.rows.map(r => ({ name: r.name, count: Number(r.count), pct: totalBrowsers > 0 ? Math.round((Number(r.count) / totalBrowsers) * 100) : 0 })),
      osSystems: osResult.rows.map(r => ({ name: r.name, count: Number(r.count), pct: totalOs > 0 ? Math.round((Number(r.count) / totalOs) * 100) : 0 })),
      dailyTrend: dailyResult.rows.map(r => ({
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        views: Number(r.views),
        visitors: Number(r.visitors),
      })),
      utmCampaigns: utmResult.rows.map(r => ({ source: r.source, medium: r.medium || 'direct', campaign: r.campaign, views: Number(r.views) })),
    })
  } catch (err: any) {
    // Table doesn't exist yet — return empty state
    if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
      return NextResponse.json({
        empty: true,
        period: { from, to },
        totalPageviews: 0,
        uniqueVisitors: 0,
        prevPageviews: 0,
        prevUniqueVisitors: 0,
        botPageviews: 0,
        topPages: [],
        topReferrers: [],
        topCountries: [],
        topCities: [],
        devices: [],
        browsers: [],
        osSystems: [],
        dailyTrend: [],
        utmCampaigns: [],
      })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
