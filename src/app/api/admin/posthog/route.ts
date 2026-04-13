import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const PH_HOST = 'https://us.posthog.com'

function getConfig() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) return null
  return { apiKey, projectId }
}

async function phFetch(path: string, apiKey: string, init?: RequestInit) {
  const res = await fetch(`${PH_HOST}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`PostHog API ${res.status}: ${text}`)
  }
  return res.json()
}

async function hogql(apiKey: string, projectId: string, query: string) {
  return phFetch(`/api/projects/${projectId}/query`, apiKey, {
    method: 'POST',
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
}

// ─── Metric handlers ────────────────────────────────────────

async function getOverview(apiKey: string, projectId: string, from: string, to: string) {
  const [eventsRes, personsRes] = await Promise.all([
    hogql(apiKey, projectId, `
      SELECT
        count() as total_events,
        countDistinct(properties.$session_id) as total_sessions,
        countDistinct(distinct_id) as unique_users
      FROM events
      WHERE timestamp >= '${from}' AND timestamp <= '${to}'
        AND event NOT LIKE '$$%'
    `),
    hogql(apiKey, projectId, `
      SELECT event, count() as count
      FROM events
      WHERE timestamp >= '${from}' AND timestamp <= '${to}'
      GROUP BY event
      ORDER BY count DESC
      LIMIT 15
    `),
  ])

  const overview = eventsRes.results?.[0] || [0, 0, 0]
  const topEvents = (personsRes.results || []).map((r: any[]) => ({
    event: r[0],
    count: r[1],
  }))

  return {
    totalEvents: overview[0],
    totalSessions: overview[1],
    uniqueUsers: overview[2],
    topEvents,
  }
}

async function getRecordings(apiKey: string, projectId: string, limit = 20) {
  const data = await phFetch(
    `/api/projects/${projectId}/session_recordings?limit=${limit}&order=-start_time`,
    apiKey,
  )

  return (data.results || []).map((r: any) => ({
    id: r.id,
    startTime: r.start_time,
    endTime: r.end_time,
    duration: r.recording_duration ?? (r.end_time && r.start_time
      ? Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 1000)
      : null),
    distinctId: r.distinct_id,
    clickCount: r.click_count ?? null,
    keypressCount: r.keypress_count ?? null,
    pageCount: r.visited_page_count ?? r.page_count ?? null,
    country: r.person?.properties?.$geoip_country_code ?? null,
    device: r.person?.properties?.$device_type ?? null,
    startUrl: r.start_url ?? null,
    viewUrl: `${PH_HOST}/project/${projectId}/replay/${r.id}`,
  }))
}

async function getRecentEvents(apiKey: string, projectId: string, limit = 30) {
  const data = await phFetch(
    `/api/projects/${projectId}/events?limit=${limit}&orderBy=-timestamp`,
    apiKey,
  )

  return (data.results || []).map((r: any) => ({
    id: r.id,
    event: r.event,
    timestamp: r.timestamp,
    distinctId: r.distinct_id,
    url: r.properties?.$current_url ?? null,
    pathname: r.properties?.$pathname ?? null,
    browser: r.properties?.$browser ?? null,
    os: r.properties?.$os ?? null,
    device: r.properties?.$device_type ?? null,
  }))
}

async function getWebVitals(apiKey: string, projectId: string, from: string, to: string) {
  const res = await hogql(apiKey, projectId, `
    SELECT
      properties.$web_vitals_LCP_value as lcp,
      properties.$web_vitals_FID_value as fid,
      properties.$web_vitals_CLS_value as cls,
      properties.$web_vitals_INP_value as inp,
      properties.$current_url as url,
      timestamp
    FROM events
    WHERE event = '$web_vitals'
      AND timestamp >= '${from}' AND timestamp <= '${to}'
    ORDER BY timestamp DESC
    LIMIT 200
  `)

  const rows = res.results || []
  if (rows.length === 0) return { lcp: null, fid: null, cls: null, inp: null, sampleCount: 0 }

  let lcpSum = 0, lcpN = 0
  let fidSum = 0, fidN = 0
  let clsSum = 0, clsN = 0
  let inpSum = 0, inpN = 0

  for (const r of rows) {
    if (r[0] != null && Number(r[0]) > 0) { lcpSum += Number(r[0]); lcpN++ }
    if (r[1] != null && Number(r[1]) > 0) { fidSum += Number(r[1]); fidN++ }
    if (r[2] != null && Number(r[2]) >= 0) { clsSum += Number(r[2]); clsN++ }
    if (r[3] != null && Number(r[3]) > 0) { inpSum += Number(r[3]); inpN++ }
  }

  return {
    lcp: lcpN > 0 ? Math.round(lcpSum / lcpN) : null,         // ms
    fid: fidN > 0 ? Math.round(fidSum / fidN) : null,         // ms
    cls: clsN > 0 ? Math.round((clsSum / clsN) * 1000) / 1000 : null, // unitless
    inp: inpN > 0 ? Math.round(inpSum / inpN) : null,         // ms
    sampleCount: rows.length,
  }
}

// ─── Route handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const config = getConfig()
  if (!config) {
    return NextResponse.json({ configured: false })
  }

  const { apiKey, projectId } = config
  const { searchParams } = new URL(request.url)
  const metric = searchParams.get('metric') || 'overview'

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 7 * 86400000)
  const from = searchParams.get('from') || defaultFrom.toISOString().slice(0, 10)
  const to = searchParams.get('to') || now.toISOString().slice(0, 10)
  const fromISO = `${from}T00:00:00Z`
  const toISO = `${to}T23:59:59Z`

  try {
    switch (metric) {
      case 'overview':
        return NextResponse.json(await getOverview(apiKey, projectId, fromISO, toISO))
      case 'recordings':
        return NextResponse.json(await getRecordings(apiKey, projectId))
      case 'events':
        return NextResponse.json(await getRecentEvents(apiKey, projectId))
      case 'web-vitals':
        return NextResponse.json(await getWebVitals(apiKey, projectId, fromISO, toISO))
      case 'all': {
        const [overview, recordings, events, vitals] = await Promise.all([
          getOverview(apiKey, projectId, fromISO, toISO),
          getRecordings(apiKey, projectId),
          getRecentEvents(apiKey, projectId),
          getWebVitals(apiKey, projectId, fromISO, toISO),
        ])
        return NextResponse.json({ overview, recordings, events, vitals })
      }
      default:
        return NextResponse.json({ error: `Unknown metric: ${metric}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[PostHog API]', err.message)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
