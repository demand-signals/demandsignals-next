import { NextRequest, NextResponse } from 'next/server'
import { createSession, authorizeSession, publicView } from '@/lib/quote-session'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { HARD_LIMITS } from '@/lib/quote-ai-budget'

export const runtime = 'nodejs'

// Per-IP session creation limit — prevents a bot from creating millions of empty sessions.
async function sessionsCreatedByIpToday(ip: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('quote_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since)
  return count ?? 0
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
    if (ip) {
      const count = await sessionsCreatedByIpToday(ip)
      if (count >= HARD_LIMITS.maxSessionsPerIpPerDay) {
        return NextResponse.json(
          { error: "You've started several sessions recently. Please book a call or try again tomorrow." },
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
