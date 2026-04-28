import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

// Allowlisted fields admins can edit on a quote_session (most other columns
// are populated by the AI flow or hold encrypted PII). Range fields are
// stored as integer dollars (not cents) per the table schema.
const EDITABLE_FIELDS = new Set<string>([
  'business_name',
  'business_type',
  'business_location',
  'estimate_low',
  'estimate_high',
  'monthly_low',
  'monthly_high',
  'status',
  'conversion_action',
  'scope_summary',
  'selected_plan_id',
  'retainer_monthly_cents',
  'valid_until',
])

const ALLOWED_STATUS = new Set(['active', 'abandoned', 'converted', 'expired', 'blocked'])

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE_FIELDS.has(k)) continue
    updates[k] = v === '' ? null : v
  }

  if (updates.status != null && !ALLOWED_STATUS.has(updates.status as string)) {
    return NextResponse.json({ error: `status must be one of ${[...ALLOWED_STATUS].join(', ')}` }, { status: 400 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('quote_sessions')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  // Explicit cleanup of child rows (CASCADE may not be set on all FKs)
  await supabaseAdmin.from('quote_messages').delete().eq('session_id', id)
  await supabaseAdmin.from('quote_events').delete().eq('session_id', id)

  // Null-out quote_session_id on any linked SOW (FK should be ON DELETE SET NULL,
  // but belt-and-suspenders in case migration hasn't run yet)
  await supabaseAdmin
    .from('sow_documents')
    .update({ quote_session_id: null })
    .eq('quote_session_id', id)

  const { error } = await supabaseAdmin
    .from('quote_sessions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  const [sessionRes, messagesRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from('quote_sessions')
      .select('*, subscription_plans:selected_plan_id ( name, tier )')
      .eq('id', id)
      .single(),
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
  // Also extract the joined retainer plan before spreading session.
  const { phone_encrypted, phone_e164_hash, subscription_plans, ...session } = sessionRes.data as Record<string, unknown>
  const retainerPlan = (subscription_plans as { name?: string; tier?: string } | null) ?? null

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
    retainerPlan,
    messages: messagesRes.data ?? [],
    events: eventsRes.data ?? [],
  })
}
