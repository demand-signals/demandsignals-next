import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data } = await supabaseAdmin
    .from('integrations')
    .select('account_email, connected_at, revoked_at, scopes')
    .eq('provider', 'google_calendar')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ connected: false, account_email: null, connected_at: null, revoked: false })
  }
  if (data.revoked_at) {
    return NextResponse.json({ connected: false, account_email: data.account_email, connected_at: data.connected_at, revoked: true })
  }

  // 2026-05-14: catch the partial-grant case where the user clicked
  // Connect but unchecked the Calendar permission on Google's consent
  // screen. Without this check, the integration row says "connected"
  // but every booking attempt 403s with ACCESS_TOKEN_SCOPE_INSUFFICIENT.
  const scopes: string[] = data.scopes ?? []
  const REQUIRED = 'https://www.googleapis.com/auth/calendar'
  // The narrower 'calendar.events' covers create/update/delete but NOT
  // freebusy.query — we require the broader scope.
  const hasCalendarScope = scopes.includes(REQUIRED)

  return NextResponse.json({
    connected: hasCalendarScope,
    account_email: data.account_email,
    connected_at: data.connected_at,
    revoked: false,
    scopes,
    scope_insufficient: !hasCalendarScope,
    required_scope: REQUIRED,
  })
}
