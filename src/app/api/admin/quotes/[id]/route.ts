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

  return NextResponse.json({
    session,
    messages: messagesRes.data ?? [],
    events: eventsRes.data ?? [],
  })
}
