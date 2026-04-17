import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession, getSessionByShareToken } from '@/lib/quote-session'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// POST /api/quote/resume
// Called from the /quote/s/[token] share page when a prospect clicks
// "Resume this conversation." Creates a NEW session cloned from the shared
// one — copies selected_items, business info, research findings — so the
// prospect picks up where they left off with a fresh conversation window
// (no budget cap carryover from the original session).
//
// Body: { share_token: string }
// Returns: { session_token, share_token, session }
const bodySchema = z.object({
  share_token: z.string().min(10).max(100),
})

export async function POST(request: NextRequest) {
  let parsed
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const source = await getSessionByShareToken(parsed.share_token)
  if (!source) {
    return NextResponse.json({ error: 'Share link not found or expired.' }, { status: 404 })
  }
  if (source.status === 'blocked') {
    return NextResponse.json({ error: 'This plan is not available.' }, { status: 403 })
  }

  // Forward IP + UA for the new session's attribution
  const ua = request.headers.get('user-agent') ?? undefined
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined

  // Create a fresh session — createSession() generates new tokens
  const newSession = await createSession({
    referrer: `resume:${parsed.share_token}`,
    user_agent: ua,
    ip_address: ip,
  })

  // Clone the business profile + configurator state + research findings
  // onto the new session. prospect_id carries forward so CRM stays linked.
  const cloneFields: Record<string, unknown> = {
    cloned_from_session_id: source.id,
    prospect_id: source.prospect_id,
    business_name: source.business_name,
    business_type: source.business_type,
    business_location: source.business_location,
    existing_site_url: source.existing_site_url,
    build_path: source.build_path,
    discovery_answers: source.discovery_answers ?? {},
    selected_items: source.selected_items ?? [],
    estimate_low: source.estimate_low,
    estimate_high: source.estimate_high,
    monthly_low: source.monthly_low,
    monthly_high: source.monthly_high,
    timeline_weeks_low: source.timeline_weeks_low,
    timeline_weeks_high: source.timeline_weeks_high,
    accuracy_pct: source.accuracy_pct ?? 50,
    missed_leads_monthly: source.missed_leads_monthly,
    avg_customer_value: source.avg_customer_value,
    person_name: source.person_name,
    person_role: source.person_role,
    research_findings: source.research_findings,
    research_completed_at: source.research_completed_at,
    research_confirmed: source.research_confirmed,
    // NOTE: phone, phone_verified, email are NOT cloned.
    // Security reasons — the cloning session's viewer might not be the same
    // human as the original. Phone/email must be re-captured.
  }
  await supabaseAdmin.from('quote_sessions').update(cloneFields).eq('id', newSession.id)

  // Seed a system message so the AI knows this is a resume and doesn't
  // re-run the opener (which would be jarring given we already have scope).
  await supabaseAdmin.from('quote_messages').insert({
    session_id: newSession.id,
    role: 'system',
    content: `[resume] This session was cloned from ${source.id}. Business profile, scope, and research findings have been carried over. Open with: "Picking up where we left off — anything you'd like to adjust before we move forward?" Do NOT repeat discovery questions that are already answered.`,
    channel: 'web',
  })

  // Log event on both sessions
  await supabaseAdmin.from('quote_events').insert([
    { session_id: source.id, event_type: 'session_resumed_from', event_data: { new_session_id: newSession.id } },
    { session_id: newSession.id, event_type: 'session_cloned_from', event_data: { source_session_id: source.id, source_share_token: parsed.share_token } },
  ])

  // Fetch the fresh session to return the full shape including cloned fields
  const { data: fresh } = await supabaseAdmin
    .from('quote_sessions')
    .select('*')
    .eq('id', newSession.id)
    .single()

  return NextResponse.json({
    session_token: newSession.session_token,
    share_token: newSession.share_token,
    session: fresh,
  })
}
