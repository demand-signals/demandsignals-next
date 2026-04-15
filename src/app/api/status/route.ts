import { NextResponse } from 'next/server'

// ── Platform configurations (add new platforms here) ────────────────────────

type PlatformConfig = {
  id: string
  name: string
  icon: string
  color: string
  statusUrl: string
  type: 'statuspage' | 'statuspage-partial' | 'custom'
  homepageUrl: string
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    icon: 'A',
    color: '#D4A574',
    statusUrl: 'https://status.claude.com/api/v2/summary.json',
    type: 'statuspage',
    homepageUrl: 'https://status.claude.com',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    icon: 'O',
    color: '#10A37F',
    statusUrl: 'https://status.openai.com/api/v2/summary.json',
    type: 'statuspage-partial',
    homepageUrl: 'https://status.openai.com',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'D',
    color: '#4D6BFE',
    statusUrl: 'https://status.deepseek.com/api/v2/summary.json',
    type: 'statuspage',
    homepageUrl: 'https://status.deepseek.com',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: 'G',
    color: '#4285F4',
    statusUrl: 'https://status.cloud.google.com/summary',
    type: 'custom',
    homepageUrl: 'https://aistudio.google.com/status',
  },
]

// ── Types ───────────────────────────────────────────────────────────────────

type ComponentStatus = 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance' | 'unknown'

type Component = {
  name: string
  status: ComponentStatus
  description?: string
}

type Incident = {
  name: string
  status: string
  impact: string
  createdAt: string
  resolvedAt: string | null
  url: string
  updates: string[]
}

type PlatformStatus = {
  id: string
  name: string
  icon: string
  color: string
  homepageUrl: string
  overallStatus: ComponentStatus
  statusDescription: string
  components: Component[]
  activeIncidents: Incident[]
  fetchedAt: string
  error?: string
}

// ── Cache (60 seconds) ──────────────────────────────────────────────────────

let cache: { data: PlatformStatus[]; fetchedAt: number } | null = null
const CACHE_TTL = 60_000 // 60 seconds

// ── Statuspage API parser (Atlassian format) ────────────────────────────────

async function fetchStatuspage(config: PlatformConfig): Promise<PlatformStatus> {
  const base: Omit<PlatformStatus, 'overallStatus' | 'statusDescription' | 'components' | 'activeIncidents' | 'fetchedAt'> = {
    id: config.id,
    name: config.name,
    icon: config.icon,
    color: config.color,
    homepageUrl: config.homepageUrl,
  }

  try {
    const res = await fetch(config.statusUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()

    // Parse overall status
    const indicator = data.status?.indicator || 'unknown'
    const overallStatus = mapIndicator(indicator)
    const statusDescription = data.status?.description || indicator

    // Parse components
    const components: Component[] = (data.components || [])
      .filter((c: Record<string, unknown>) => !c.group && c.name !== 'Visit our status page') // filter groups and meta
      .map((c: Record<string, unknown>) => ({
        name: c.name as string,
        status: mapComponentStatus(c.status as string),
        description: (c.description as string) || undefined,
      }))

    // Parse active incidents
    const activeIncidents: Incident[] = (data.incidents || [])
      .filter((i: Record<string, unknown>) => i.status !== 'resolved' && i.status !== 'postmortem')
      .slice(0, 5)
      .map((i: Record<string, unknown>) => ({
        name: i.name as string,
        status: i.status as string,
        impact: i.impact as string,
        createdAt: i.created_at as string,
        resolvedAt: (i.resolved_at as string) || null,
        url: (i.shortlink as string) || config.homepageUrl,
        updates: ((i.incident_updates as Array<Record<string, string>>) || [])
          .slice(0, 3)
          .map((u) => u.body)
          .filter(Boolean),
      }))

    return {
      ...base,
      overallStatus,
      statusDescription,
      components,
      activeIncidents,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      ...base,
      overallStatus: 'unknown',
      statusDescription: 'Unable to fetch status',
      components: [],
      activeIncidents: [],
      fetchedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ── Google custom handler (no standard API) ─────────────────────────────────

async function fetchGoogleStatus(config: PlatformConfig): Promise<PlatformStatus> {
  // Google AI Studio doesn't have a public status API
  // We return a placeholder that links to their status page
  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    color: config.color,
    homepageUrl: config.homepageUrl,
    overallStatus: 'unknown',
    statusDescription: 'Check status page directly',
    components: [
      { name: 'Gemini API', status: 'unknown' },
      { name: 'AI Studio', status: 'unknown' },
    ],
    activeIncidents: [],
    fetchedAt: new Date().toISOString(),
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapIndicator(indicator: string): ComponentStatus {
  switch (indicator) {
    case 'none': return 'operational'
    case 'minor': return 'degraded_performance'
    case 'major': return 'partial_outage'
    case 'critical': return 'major_outage'
    case 'maintenance': return 'under_maintenance'
    default: return 'unknown'
  }
}

function mapComponentStatus(status: string): ComponentStatus {
  switch (status) {
    case 'operational': return 'operational'
    case 'degraded_performance': return 'degraded_performance'
    case 'partial_outage': return 'partial_outage'
    case 'major_outage': return 'major_outage'
    case 'under_maintenance': return 'under_maintenance'
    default: return 'unknown'
  }
}

// ── GET /api/status ─────────────────────────────────────────────────────────

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({
      platforms: cache.data,
      cached: true,
      cachedAt: new Date(cache.fetchedAt).toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  }

  // Fetch all platforms in parallel
  const results = await Promise.all(
    PLATFORMS.map(config => {
      if (config.type === 'custom') return fetchGoogleStatus(config)
      return fetchStatuspage(config)
    })
  )

  // Update cache
  cache = { data: results, fetchedAt: Date.now() }

  return NextResponse.json({
    platforms: results,
    cached: false,
    fetchedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  })
}
