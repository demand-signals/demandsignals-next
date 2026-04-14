import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const PH_HOST = 'https://us.posthog.com'

function getConfig() {
  const apiKey = process.env.POSTHOG_CLAUDE_KEY || process.env.POSTHOG_CLAUD_KEY || process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_DSIG_ID || process.env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) {
    const missing: string[] = []
    if (!apiKey) missing.push('POSTHOG_CLAUDE_KEY (Personal API Key, starts with phx_)')
    if (!projectId) missing.push('POSTHOG_DSIG_ID (numeric project ID)')
    return { error: `Missing env vars: ${missing.join(', ')}` }
  }
  return { apiKey, projectId, error: null }
}

/** Convert ISO date string to HogQL-compatible format: '2026-04-07 00:00:00' */
function toHogQLDate(iso: string): string {
  return iso.replace('T', ' ').replace('Z', '')
}

async function phFetch(path: string, apiKey: string, init?: RequestInit) {
  const url = `${PH_HOST}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
  } catch (fetchErr: any) {
    throw new Error(`Network error fetching ${url}: ${fetchErr.message}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`PostHog API ${res.status}: ${text}`)
  }
  return res.json()
}

async function hogql(apiKey: string, projectId: string, query: string) {
  return phFetch(`/api/projects/${projectId}/query/`, apiKey, {
    method: 'POST',
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
}

// ─── Metric handlers ────────────────────────────────────────

async function getOverview(apiKey: string, projectId: string, from: string, to: string) {
  const fromDt = toHogQLDate(from)
  const toDt = toHogQLDate(to)

  const [eventsRes, personsRes] = await Promise.all([
    hogql(apiKey, projectId, `
      SELECT
        count() as total_events,
        count(DISTINCT properties.$session_id) as total_sessions,
        count(DISTINCT distinct_id) as unique_users
      FROM events
      WHERE timestamp >= toDateTime('${fromDt}') AND timestamp <= toDateTime('${toDt}')
    `),
    hogql(apiKey, projectId, `
      SELECT event, count() as count
      FROM events
      WHERE timestamp >= toDateTime('${fromDt}') AND timestamp <= toDateTime('${toDt}')
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
    `/api/projects/${projectId}/session_recordings/?limit=${limit}`,
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
    `/api/projects/${projectId}/events/?limit=${limit}&ordering=-timestamp`,
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
  const fromDt = toHogQLDate(from)
  const toDt = toHogQLDate(to)

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
      AND timestamp >= toDateTime('${fromDt}') AND timestamp <= toDateTime('${toDt}')
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
    lcp: lcpN > 0 ? Math.round(lcpSum / lcpN) : null,
    fid: fidN > 0 ? Math.round(fidSum / fidN) : null,
    cls: clsN > 0 ? Math.round((clsSum / clsN) * 1000) / 1000 : null,
    inp: inpN > 0 ? Math.round(inpSum / inpN) : null,
    sampleCount: rows.length,
  }
}

// ─── Route handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const config = getConfig()
  if (config.error) {
    return NextResponse.json({ configured: false, detail: config.error })
  }

  const apiKey = config.apiKey!
  const projectId = config.projectId!
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
      case 'test': {
        try {
          const testRes = await phFetch(`/api/projects/${projectId}/`, apiKey)
          return NextResponse.json({
            ok: true,
            project: { id: testRes.id, name: testRes.name, created_at: testRes.created_at },
            keyPrefix: apiKey.slice(0, 6) + '...',
            projectIdUsed: projectId,
          })
        } catch (testErr: any) {
          return NextResponse.json({
            ok: false,
            error: testErr.message,
            keyPrefix: apiKey.slice(0, 6) + '...',
            projectIdUsed: projectId,
          })
        }
      }
      case 'overview':
        return NextResponse.json(await getOverview(apiKey, projectId, fromISO, toISO))
      case 'recordings':
        return NextResponse.json(await getRecordings(apiKey, projectId))
      case 'events':
        return NextResponse.json(await getRecentEvents(apiKey, projectId))
      case 'web-vitals':
        return NextResponse.json(await getWebVitals(apiKey, projectId, fromISO, toISO))
      case 'all': {
        const [overviewResult, recordingsResult, eventsResult, vitalsResult] = await Promise.allSettled([
          getOverview(apiKey, projectId, fromISO, toISO),
          getRecordings(apiKey, projectId),
          getRecentEvents(apiKey, projectId),
          getWebVitals(apiKey, projectId, fromISO, toISO),
        ])

        const overview = overviewResult.status === 'fulfilled'
          ? overviewResult.value
          : { totalEvents: 0, totalSessions: 0, uniqueUsers: 0, topEvents: [], error: overviewResult.reason?.message }

        const recordings = recordingsResult.status === 'fulfilled'
          ? recordingsResult.value
          : []

        const events = eventsResult.status === 'fulfilled'
          ? eventsResult.value
          : []

        const vitals = vitalsResult.status === 'fulfilled'
          ? vitalsResult.value
          : { lcp: null, fid: null, cls: null, inp: null, sampleCount: 0 }

        const errors = [overviewResult, recordingsResult, eventsResult, vitalsResult]
          .filter(r => r.status === 'rejected')
          .map((r: any) => r.reason?.message)

        return NextResponse.json({
          overview,
          recordings,
          events,
          vitals,
          ...(errors.length > 0 ? { _partialErrors: errors } : {}),
        })
      }
      default:
        return NextResponse.json({ error: `Unknown metric: ${metric}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[PostHog API]', err.message, err.stack)
    return NextResponse.json({
      error: err.message,
    }, { status: 502 })
  }
}
