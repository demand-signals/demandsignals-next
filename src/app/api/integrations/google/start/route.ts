import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAuthorizationUrl } from '@/lib/google-oauth'
import crypto from 'node:crypto'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const state = crypto.randomBytes(16).toString('base64url')
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
