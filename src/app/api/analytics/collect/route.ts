import { NextRequest, NextResponse } from 'next/server'
import { insertPageview } from '@/lib/analytics-db'

/**
 * POST /api/analytics/collect
 *
 * Receives pageview beacons from the client-side tracker.
 * Enriches with server-side geo data from Vercel's headers.
 * Stores in Postgres. No cookies, no PII retained.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Basic validation
    const path = typeof body.p === 'string' ? body.p.slice(0, 500) : null
    if (!path) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Server-side enrichment from Vercel's edge headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '0.0.0.0'
    const userAgent = req.headers.get('user-agent') || ''
    const country = req.headers.get('x-vercel-ip-country') || undefined
    const region = req.headers.get('x-vercel-ip-country-region') || undefined
    const city = req.headers.get('x-vercel-ip-city')
      ? decodeURIComponent(req.headers.get('x-vercel-ip-city')!)
      : undefined

    await insertPageview({
      path,
      referrer: typeof body.r === 'string' ? body.r.slice(0, 1000) : undefined,
      utmSource: typeof body.us === 'string' ? body.us.slice(0, 200) : undefined,
      utmMedium: typeof body.um === 'string' ? body.um.slice(0, 200) : undefined,
      utmCampaign: typeof body.uc === 'string' ? body.uc.slice(0, 200) : undefined,
      utmTerm: typeof body.ut === 'string' ? body.ut.slice(0, 200) : undefined,
      utmContent: typeof body.ux === 'string' ? body.ux.slice(0, 200) : undefined,
      screenWidth: typeof body.sw === 'number' ? body.sw : undefined,
      screenHeight: typeof body.sh === 'number' ? body.sh : undefined,
      ip,
      userAgent,
      country,
      region,
      city,
    })

    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (err) {
    // Silently accept — never let analytics failures affect visitors
    // This catches missing POSTGRES_URL, connection errors, table not created, etc.
    if (process.env.NODE_ENV === 'development') {
      console.error('[Analytics] Failed to record pageview:', err instanceof Error ? err.message : err)
    }
    return NextResponse.json({ ok: true }, { status: 202 })
  }
}

// Disable body size limit warnings for beacon payloads
export const runtime = 'nodejs'
