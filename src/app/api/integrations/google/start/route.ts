import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAuthorizationUrl } from '@/lib/google-oauth'
import crypto from 'node:crypto'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const state = crypto.randomBytes(16).toString('base64url')

  // Diagnostic log — confirms which env var name the runtime is reading.
  console.log('[oauth_start_diag]', JSON.stringify({
    GOOGLE_DSIG_MAIN_ID_042826_first30: (process.env.GOOGLE_DSIG_MAIN_ID_042826 ?? '<undefined>').slice(0, 30),
    GOOGLE_CLIENT_ID_first30: (process.env.GOOGLE_CLIENT_ID ?? '<undefined>').slice(0, 30),
    BLOGGER_CLIENT_ID_first30: (process.env.BLOGGER_CLIENT_ID ?? '<undefined>').slice(0, 30),
  }))

  const url = getAuthorizationUrl(state)

  const res = NextResponse.redirect(url)
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
