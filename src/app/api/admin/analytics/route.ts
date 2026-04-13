import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { neon } from '@neondatabase/serverless'

function getSQL() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('No database URL configured')
  return neon(url)
}

const emptyResponse = (from: string, to: string) => ({
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

  try {
    const sql = getSQL()

    // Check if table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'pageviews'
      ) as exists
    `
    if (!tableCheck[0]?.exists) {
      return NextResponse.json(emptyResponse(from, to))
    }

    // Run all queries in parallel
    const [
      pvResult, uvResult, prevPvResult, prevUvResult, botResult,
      topPagesResult, topReferrersResult, topCountriesResult, topCitiesResult,
      devicesResult, browsersResult, osResult, dailyResult, utmResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false`,
      sql`SELECT COUNT(DISTINCT visitor_hash) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND visitor_hash IS NOT NULL`,
      sql`SELECT COUNT(*) as count FROM pageviews WHERE created_at >= ${prevFrom} AND created_at < ${fromDate} AND is_bot = false`,
      sql`SELECT COUNT(DISTINCT visitor_hash) as count FROM pageviews WHERE created_at >= ${prevFrom} AND created_at < ${fromDate} AND is_bot = false AND visitor_hash IS NOT NULL`,
      sql`SELECT COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = true`,
      sql`SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY path ORDER BY views DESC LIMIT 30`,
      sql`SELECT referrer_domain as domain, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND referrer_domain IS NOT NULL AND referrer_domain != 'demandsignals.co' GROUP BY referrer_domain ORDER BY views DESC LIMIT 15`,
      sql`SELECT country, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND country IS NOT NULL GROUP BY country ORDER BY views DESC LIMIT 10`,
      sql`SELECT city, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND city IS NOT NULL GROUP BY city ORDER BY views DESC LIMIT 10`,
      sql`SELECT device_type as type, COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY device_type ORDER BY count DESC`,
      sql`SELECT browser as name, COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY browser ORDER BY count DESC LIMIT 8`,
      sql`SELECT os as name, COUNT(*) as count FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY os ORDER BY count DESC LIMIT 8`,
      sql`SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false GROUP BY DATE(created_at) ORDER BY date ASC`,
      sql`SELECT utm_source as source, utm_medium as medium, utm_campaign as campaign, COUNT(*) as views FROM pageviews WHERE created_at >= ${fromDate} AND created_at <= ${toDate} AND is_bot = false AND utm_source IS NOT NULL GROUP BY utm_source, utm_medium, utm_campaign ORDER BY views DESC LIMIT 10`,
    ])

    const totalPv = Number(pvResult[0]?.count ?? 0)
    const totalDevices = devicesResult.reduce((s: number, r: any) => s + Number(r.count), 0)
    const totalBrowsers = browsersResult.reduce((s: number, r: any) => s + Number(r.count), 0)
    const totalOs = osResult.reduce((s: number, r: any) => s + Number(r.count), 0)

    return NextResponse.json({
      period: { from, to },
      totalPageviews: totalPv,
      uniqueVisitors: Number(uvResult[0]?.count ?? 0),
      prevPageviews: Number(prevPvResult[0]?.count ?? 0),
      prevUniqueVisitors: Number(prevUvResult[0]?.count ?? 0),
      botPageviews: Number(botResult[0]?.count ?? 0),
      topPages: topPagesResult.map((r: any) => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) })),
      topReferrers: topReferrersResult.map((r: any) => ({ domain: r.domain, views: Number(r.views) })),
      topCountries: topCountriesResult.map((r: any) => ({ country: r.country, views: Number(r.views) })),
      topCities: topCitiesResult.map((r: any) => ({ city: r.city, views: Number(r.views) })),
      devices: devicesResult.map((r: any) => ({ type: r.type, count: Number(r.count), pct: totalDevices > 0 ? Math.round((Number(r.count) / totalDevices) * 100) : 0 })),
      browsers: browsersResult.map((r: any) => ({ name: r.name, count: Number(r.count), pct: totalBrowsers > 0 ? Math.round((Number(r.count) / totalBrowsers) * 100) : 0 })),
      osSystems: osResult.map((r: any) => ({ name: r.name, count: Number(r.count), pct: totalOs > 0 ? Math.round((Number(r.count) / totalOs) * 100) : 0 })),
      dailyTrend: dailyResult.map((r: any) => ({
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        views: Number(r.views),
        visitors: Number(r.visitors),
      })),
      utmCampaigns: utmResult.map((r: any) => ({ source: r.source, medium: r.medium || 'direct', campaign: r.campaign, views: Number(r.views) })),
    })
  } catch (err: any) {
    const isDbMissing = err.message?.includes('relation') && err.message?.includes('does not exist')
    const isNoConnection = err.message?.includes('DATABASE_URL') || err.message?.includes('POSTGRES_URL') || err.message?.includes('connection') || err.code === 'ECONNREFUSED'
    if (isDbMissing || isNoConnection || err.message?.includes('does not exist')) {
      return NextResponse.json(emptyResponse(from, to))
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
