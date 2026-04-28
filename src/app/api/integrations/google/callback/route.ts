import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { exchangeCodeForTokens } from '@/lib/google-oauth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const adminUrl = `${url.origin}/admin/integrations/google`

  if (error) {
    return NextResponse.redirect(`${adminUrl}?error=${encodeURIComponent(error)}`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${adminUrl}?error=missing_code_or_state`)
  }
  const cookieState = request.cookies.get('google_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${adminUrl}?error=state_mismatch`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabaseAdmin
      .from('integrations')
      .upsert({
        provider: 'google_calendar',
        account_email: tokens.account_email,
        scopes: tokens.scopes,
        access_token: tokens.access_token,
        access_token_expires_at: expiresAt,
        refresh_token: tokens.refresh_token,
        metadata: { name: tokens.account_name, picture: tokens.account_picture },
        connected_by: auth.user.id,
        revoked_at: null,
      }, { onConflict: 'provider,account_email' })

    const res = NextResponse.redirect(`${adminUrl}?connected=1`)
    res.cookies.delete('google_oauth_state')
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.redirect(`${adminUrl}?error=${encodeURIComponent(msg)}`)
  }
}
