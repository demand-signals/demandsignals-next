import { NextRequest, NextResponse } from 'next/server'
import { saveToken } from '@/lib/oauth'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'

// GET /api/admin/auth/blogger/callback — Google redirects here with ?code=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(renderResult('Blogger Authorization Failed', `Google returned an error: ${error}`, false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!code) {
    return new NextResponse(renderResult('Missing Code', 'No authorization code received from Google.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.BLOGGER_CLIENT_ID!,
        client_secret: process.env.BLOGGER_CLIENT_SECRET!,
        redirect_uri: `${SITE_URL}/api/admin/auth/blogger/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      throw new Error(`Token exchange failed: ${tokenRes.status} — ${errText}`)
    }

    const tokenData = await tokenRes.json()

    // Store in Supabase
    await saveToken('blogger', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      raw: tokenData,
    })

    return new NextResponse(
      renderResult('Blogger Connected', 'OAuth tokens saved. You can now syndicate posts to Blogger from the Blog admin.', true),
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new NextResponse(renderResult('Blogger Connection Failed', message, false), {
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
