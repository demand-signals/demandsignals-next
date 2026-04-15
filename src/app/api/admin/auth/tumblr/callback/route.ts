import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/oauth1a'
import { saveToken } from '@/lib/oauth'
import { requireAdmin } from '@/lib/admin-auth'

// GET /api/admin/auth/tumblr/callback — Tumblr redirects here with ?oauth_token=&oauth_verifier=
export async function GET(request: NextRequest) {
  // Verify the user is an authenticated admin
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const oauthToken = searchParams.get('oauth_token')
  const oauthVerifier = searchParams.get('oauth_verifier')

  // Read the request token secret from cookie (set during initiate step)
  const oauthTokenSecret = request.cookies.get('tumblr_oauth_secret')?.value

  if (!oauthToken || !oauthVerifier) {
    return new NextResponse(
      renderResult('Tumblr Authorization Failed', 'Missing oauth_token or oauth_verifier from Tumblr.', false),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!oauthTokenSecret) {
    return new NextResponse(
      renderResult('Session Expired', 'The request token secret cookie expired. Please try connecting again from the Blog admin.', false),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  const consumerKey = process.env.TUMBLR_OAUTH_CONSUMER_KEY!
  const consumerSecret = process.env.TUMBLR_SECRET_KEY!

  try {
    const { oauth_token: accessToken, oauth_token_secret: accessTokenSecret } = await getAccessToken(
      consumerKey,
      consumerSecret,
      oauthToken,
      oauthTokenSecret,
      oauthVerifier
    )

    // Store in Supabase — OAuth 1.0a tokens don't expire
    await saveToken('tumblr', {
      access_token: accessToken,
      refresh_token: accessTokenSecret, // Store token_secret in refresh_token column
      token_type: 'OAuth1',
      // No expires_in — OAuth 1.0a tokens are permanent
    })

    // Clear the temp cookie
    const response = new NextResponse(
      renderResult('Tumblr Connected', 'OAuth tokens saved. You can now syndicate posts to Tumblr from the Blog admin.', true),
      { headers: { 'Content-Type': 'text/html' } }
    )
    response.cookies.delete('tumblr_oauth_secret')
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new NextResponse(renderResult('Tumblr Connection Failed', message, false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function renderResult(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f4f6f9; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 480px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { color: #1d2330; font-size: 22px; margin: 0 0 12px; }
  p { color: #5d6780; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }
  a { display: inline-block; padding: 10px 24px; background: #68c5ad; color: white; border-radius: 8px; text-decoration: none; font-weight: 500; }
  a:hover { background: #4fa894; }
</style></head><body>
<div class="card">
  <div class="icon">${success ? '✅' : '❌'}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="/admin/blog">Back to Blog Admin</a>
</div>
</body></html>`
}
