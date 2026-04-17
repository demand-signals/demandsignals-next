import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  const [sessionRes, messagesRes, eventsRes] = await Promise.all([
    supabaseAdmin.from('quote_sessions').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('quote_messages')
      .select('id, role, content, channel, flagged, flag_reason, ai_model_used, cost_cents, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('quote_events')
      .select('id, event_type, event_data, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (sessionRes.error) return NextResponse.json({ error: sessionRes.error.message }, { status: 404 })

  // Strip encrypted phone from admin response — admin sees last-four only.
  const { phone_encrypted, phone_e164_hash, ...session } = sessionRes.data as Record<string, unknown>

  // If the session is linked to a prospect, fetch the prospect snapshot for the UI
  let prospect: Record<string, unknown> | null = null
  if (session.prospect_id) {
    const { data: p } = await supabaseAdmin
      .from('prospects')
      .select('id, business_name, industry, city, state, stage, tags, owner_email, owner_phone, business_phone, website_url, google_rating, google_review_count, site_quality_score, scope_summary, quote_estimate_low_cents, quote_estimate_high_cents, last_activity_at, last_contacted_at, created_at')
      .eq('id', session.prospect_id as string)
      .maybeSingle()
    prospect = p ?? null
  }

  return NextResponse.json({
    session,
    prospect,
    messages: messagesRes.data ?? [],
    events: eventsRes.data ?? [],
  })
}
