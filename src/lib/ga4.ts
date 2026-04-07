/**
 * GA4 Measurement Protocol — Server-Side Event Tracking
 *
 * Sends events directly to Google Analytics 4 from API routes,
 * bypassing ad blockers and cookie consent. Used for high-value
 * server-side conversions (contact form, report requests, signups).
 *
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

const GA4_MEASUREMENT_ID = 'G-JYSS0XVLTY'
const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect'

interface GA4Event {
  name: string
  params?: Record<string, string | number | boolean>
}

interface GA4Options {
  /** Client ID — falls back to a server-generated ID if not provided */
  clientId?: string
  /** User IP for approximate geo (forwarded via X-Forwarded-For) */
  userIp?: string
  /** User agent string */
  userAgent?: string
}

/**
 * Fire one or more events to GA4 via the Measurement Protocol.
 * Non-blocking — errors are logged but never thrown.
 */
export async function trackGA4Event(
  events: GA4Event | GA4Event[],
  options: GA4Options = {}
): Promise<void> {
  const apiSecret = process.env.GOOGLE_MEASUREMENT_API
  if (!apiSecret) {
    console.warn('[GA4] GOOGLE_MEASUREMENT_API env var not set — skipping event')
    return
  }

  const eventList = Array.isArray(events) ? events : [events]
  const clientId = options.clientId || `server.${Date.now()}.${Math.floor(Math.random() * 1e9)}`

  const payload = {
    client_id: clientId,
    non_personalized_ads: true,
    events: eventList.map((e) => ({
      name: e.name,
      params: {
        engagement_time_msec: '100',
        session_id: `${Date.now()}`,
        ...e.params,
      },
    })),
  }

  try {
    const url = `${GA4_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${apiSecret}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.userAgent ? { 'User-Agent': options.userAgent } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error(`[GA4] Measurement Protocol returned ${res.status}`)
    }
  } catch (err) {
    console.error('[GA4] Failed to send event:', err instanceof Error ? err.message : err)
  }
}

/**
 * Helper: extract client context from a NextRequest for GA4 tracking.
 */
export function getGA4Context(req: { headers: { get(name: string): string | null } }): GA4Options {
  return {
    userIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }
}
