import { NextRequest, NextResponse } from 'next/server'
import { authorizeSession } from '@/lib/quote-session'
import { runResearch } from '@/lib/quote-research'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/quote/research/kick
// Client calls this (fire-and-forget) the first time business_name +
// business_location are both captured. Runs research asynchronously; the
// chat endpoint reads the completed findings on subsequent turns.
//
// Guards:
//   - session auth via x-session-token header
//   - idempotent: if research already started or completed in this session, returns 200 immediately
//   - caller can pass { force: true } to re-run (e.g., URL changed)
export async function POST(request: NextRequest) {
  const auth = await authorizeSession(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
  }
  const { session } = auth

  const body = await request.json().catch(() => ({}))
  const force = body.force === true

  // Check current research state
  const { data: fresh } = await supabaseAdmin
    .from('quote_sessions')
    .select('research_started_at, research_completed_at')
    .eq('id', session.id)
    .single()

  if (!force && fresh?.research_completed_at) {
    return NextResponse.json({ ok: true, status: 'already_completed' })
  }
  if (!force && fresh?.research_started_at) {
    // If started within last 2 minutes, assume it's still running
    const startedAgeMs = Date.now() - new Date(fresh.research_started_at).getTime()
    if (startedAgeMs < 120_000) {
      return NextResponse.json({ ok: true, status: 'in_progress' })
    }
  }

  if (!session.business_name) {
    return NextResponse.json({ ok: false, error: 'business_name not set yet' }, { status: 400 })
  }

  // Run research synchronously within this serverless invocation.
  // Completes in 2-10 seconds typically (1 Places text search + 1 details + 1 site fetch).
  // We're already in a background request from the client's perspective, so no streaming.
  try {
    const findings = await runResearch(session.id)
    return NextResponse.json({
      ok: true,
      status: 'completed',
      has_place: findings.place !== null,
      match_confidence: findings.match_confidence,
      observations_count: findings.observations.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'research failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
