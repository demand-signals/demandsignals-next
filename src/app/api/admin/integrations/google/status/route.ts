import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data } = await supabaseAdmin
    .from('integrations')
    .select('account_email, connected_at, revoked_at')
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
  return NextResponse.json({ connected: true, account_email: data.account_email, connected_at: data.connected_at, revoked: false })
}
