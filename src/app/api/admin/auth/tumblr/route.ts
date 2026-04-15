import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getRequestToken } from '@/lib/oauth1a'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'

// GET /api/admin/auth/tumblr → gets request token, redirects to Tumblr authorize
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const consumerKey = process.env.TUMBLR_OAUTH_CONSUMER_KEY
  const consumerSecret = process.env.TUMBLR_SECRET_KEY
  if (!consumerKey || !consumerSecret) {
    return NextResponse.json({ error: 'TUMBLR_OAUTH_CONSUMER_KEY and TUMBLR_SECRET_KEY not configured' }, { status: 500 })
  }

  try {
    const callbackUrl = `${SITE_URL}/api/admin/auth/tumblr/callback`
    const { oauth_token, oauth_token_secret } = await getRequestToken(consumerKey, consumerSecret, callbackUrl)

    // Store the request token secret in a cookie (needed for access token exchange)
    const authorizeUrl = `https://www.tumblr.com/oauth/authorize?oauth_token=${oauth_token}`
    const response = NextResponse.redirect(authorizeUrl)

    response.cookies.set('tumblr_oauth_secret', oauth_token_secret, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/admin/auth/tumblr',
      maxAge: 600, // 10 minutes — just enough for the auth flow
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
