// ── GET /api/cron/lead-surfaces-health ───────────────────────────────
//
// Synthetic probe of the two canonical lead-capture surfaces:
//   1. POST /api/inquiry with honeypot filled (returns 200, no DB write)
//   2. GET  /api/book/slots
//
// Any non-2xx OR unexpected response body fires a CRITICAL alert via
// notify(). The in-route notify() hooks added 2026-05-15 catch every
// in-process failure; this cron is the third safety net for failures
// the in-route alerting can't catch:
//   - Vercel deploy hung / cold-start crash
//   - DNS or CDN-layer outage
//   - Next.js route handler missing (e.g. botched deploy)
//   - Database connection pool exhausted before notify() can write
//
// Schedule (vercel.json): every 4 hours. Tighter cadence isn't worth
// the Vercel cron minutes; loose enough that a single failure window
// is at most ~4h of blind exposure but we still catch sustained outages.
//
// Auth: Bearer token matches CRON_SECRET (Vercel Cron supplies header).

import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerSecret } from '@/lib/bearer-auth'
import { notify } from '@/lib/system-alerts'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'

interface ProbeResult {
  surface: 'inquiry' | 'book_slots'
  ok: boolean
  status: number
  detail?: string
  latency_ms: number
}

async function probeInquiry(): Promise<ProbeResult> {
  const t0 = Date.now()
  try {
    const res = await fetch(`${SITE_URL}/api/inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': SITE_URL,
        'User-Agent': 'dsig-cron-health-probe/1.0',
      },
      body: JSON.stringify({
        // Honeypot filled → API returns 200 with no DB write
        // (see /api/inquiry/route.ts line 16-17).
        website: 'cron-health-probe-honeypot',
        // Name+email required to pass validation in case honeypot ever
        // changes behavior; harmless because honeypot blocks the write.
        name: 'health-probe',
        email: 'health-probe@demandsignals.co',
        source: 'inquiry_strip',
        page_url: '/_health',
      }),
    })
    const latency_ms = Date.now() - t0
    const body = await res.text()
    const ok = res.status === 200 && body.includes('"success":true')
    return {
      surface: 'inquiry',
      ok,
      status: res.status,
      detail: ok ? undefined : body.slice(0, 500),
      latency_ms,
    }
  } catch (e) {
    return {
      surface: 'inquiry',
      ok: false,
      status: 0,
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - t0,
    }
  }
}

async function probeBookSlots(): Promise<ProbeResult> {
  const t0 = Date.now()
  try {
    const res = await fetch(`${SITE_URL}/api/book/slots`, {
      method: 'GET',
      headers: {
        'Origin': SITE_URL,
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'dsig-cron-health-probe/1.0',
      },
    })
    const latency_ms = Date.now() - t0
    const body = await res.text()
    // 200 with slots OR 503 (advertised "temporarily unavailable") are
    // BOTH acceptable from a cron's perspective — they mean the endpoint
    // is alive and the in-route notify() already alerted on the 503.
    // The cron only alerts on truly unexpected outcomes (500, 5xx other
    // than 503, network error, malformed body).
    const isHealthy = res.status === 200 && body.includes('"ok":true')
    const isExpectedFailure = res.status === 503
    const ok = isHealthy || isExpectedFailure
    return {
      surface: 'book_slots',
      ok,
      status: res.status,
      detail: ok ? undefined : body.slice(0, 500),
      latency_ms,
    }
  } catch (e) {
    return {
      surface: 'book_slots',
      ok: false,
      status: 0,
      detail: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - t0,
    }
  }
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [inquiry, bookSlots] = await Promise.all([
    probeInquiry(),
    probeBookSlots(),
  ])

  const failures = [inquiry, bookSlots].filter((p) => !p.ok)

  for (const f of failures) {
    await notify({
      severity: 'critical',
      source: 'cron_health',
      title: `Synthetic probe FAILED: ${f.surface}`,
      body: `Surface ${f.surface} returned status=${f.status} latency=${f.latency_ms}ms\n\nDetail: ${f.detail ?? '(none)'}\n\nThis alert fires from /api/cron/lead-surfaces-health every 4 hours. If you see it, the named surface is broken in a way the in-route notify() didn't catch — likely an infrastructure-level failure (cold start, DNS, route missing).`,
      context: {
        error_code: `probe_failed_${f.surface}`,
        surface: f.surface,
        status: f.status,
        latency_ms: f.latency_ms,
        detail: f.detail,
      },
    })
  }

  return NextResponse.json({
    ok: failures.length === 0,
    probed_at: new Date().toISOString(),
    results: { inquiry, book_slots: bookSlots },
    failures: failures.length,
  })
}
