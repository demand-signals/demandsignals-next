import { NextRequest, NextResponse } from 'next/server'
import { createSession, authorizeSession, publicView } from '@/lib/quote-session'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { HARD_LIMITS } from '@/lib/quote-ai-budget'

export const runtime = 'nodejs'

// Per-IP session creation limit — prevents a bot from creating millions of empty sessions.
// IMPORTANT: We only count sessions that had real user activity (at least one user
// message). Empty/bounced sessions don't burn our budget and shouldn't burn the prospect's
// quota — otherwise a family sharing an IP or a prospect closing and re-opening the tab
// gets falsely blocked.
async function activeSessionsByIpToday(ip: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  // Subquery: sessions from this IP in last 24h that have at least one user message
  const { data } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, quote_messages!inner(id, role)', { count: undefined })
    .eq('ip_address', ip)
    .gte('created_at', since)
    .eq('quote_messages.role', 'user')
    .limit(100)
  // Dedup session ids — the join produces one row per matching message
  const uniq = new Set((data ?? []).map((r) => r.id))
  return uniq.size
}

// POST /api/quote/session — create a new session. Anonymous, no auth required.
// Returns { session_token, share_token, session } where session is the public view.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const ua = request.headers.get('user-agent') ?? undefined
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined

    // Rate limit session creation per IP — defense against abuse.
    // Only counts sessions with real user activity, so bounces don't count.
    if (ip) {
      const count = await activeSessionsByIpToday(ip)
      if (count >= HARD_LIMITS.maxSessionsPerIpPerDay) {
        return NextResponse.json(
          {
            error: "You've started several sessions recently. Please book a call or text us at (916) 542-2423 to continue.",
            rate_limited: true,
            fallback: {
              sms: 'sms:+19165422423',
              email: 'mailto:DemandSignals@gmail.com',
              booking: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true',
            },
          },
          { status: 429 },
        )
      }
    }

    const session = await createSession({
      referrer: typeof body.referrer === 'string' ? body.referrer : undefined,
      utm_source: typeof body.utm_source === 'string' ? body.utm_source : undefined,
      utm_medium: typeof body.utm_medium === 'string' ? body.utm_medium : undefined,
      utm_campaign: typeof body.utm_campaign === 'string' ? body.utm_campaign : undefined,
      device: body.device === 'desktop' || body.device === 'mobile' || body.device === 'tablet' ? body.device : undefined,
      screen_resolution: typeof body.screen_resolution === 'string' ? body.screen_resolution : undefined,
      browser_language: typeof body.browser_language === 'string' ? body.browser_language : undefined,
      user_agent: ua,
      ip_address: ip,
    })

    return NextResponse.json({
      session_token: session.session_token,
      share_token: session.share_token,
      session: publicView(session),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/quote/session — fetch current session via x-session-token header.
export async function GET(request: NextRequest) {
  const auth = await authorizeSession(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }
  return NextResponse.json({ session: publicView(auth.session) })
}
