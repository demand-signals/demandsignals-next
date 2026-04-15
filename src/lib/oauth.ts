import { supabaseAdmin } from '@/lib/supabase/admin'

type Platform = 'blogger' | 'tumblr'

type StoredToken = {
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  token_type: string
}

// ── Get stored token for a platform ─────────────────────────────────────────

export async function getToken(platform: Platform): Promise<StoredToken | null> {
  const { data } = await supabaseAdmin
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at, token_type')
    .eq('platform', platform)
    .single()
  return data ?? null
}

// ── Upsert token after OAuth callback ───────────────────────────────────────

export async function saveToken(
  platform: Platform,
  token: {
    access_token: string
    refresh_token?: string | null
    token_type?: string
    expires_in?: number
    scope?: string
    raw?: Record<string, unknown>
  }
) {
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null

  await supabaseAdmin
    .from('oauth_tokens')
    .upsert({
      platform,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      token_type: token.token_type ?? 'Bearer',
      expires_at: expiresAt,
      scope: token.scope ?? null,
      raw_response: token.raw ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'platform' })
}

// ── Check if token is expired (with 5-min buffer) ───────────────────────────

export function isExpired(token: StoredToken): boolean {
  if (!token.expires_at) return false
  return new Date(token.expires_at).getTime() < Date.now() + 5 * 60 * 1000
}

// ── Refresh Blogger token (Google OAuth2) ───────────────────────────────────

export async function refreshBloggerToken(): Promise<string> {
  const stored = await getToken('blogger')
  if (!stored) throw new Error('No Blogger token stored — authorize at /api/admin/auth/blogger')
  if (!isExpired(stored)) return stored.access_token
  if (!stored.refresh_token) throw new Error('Blogger token expired and no refresh token — re-authorize at /api/admin/auth/blogger')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.BLOGGER_CLIENT_ID!,
      client_secret: process.env.BLOGGER_CLIENT_SECRET!,
      refresh_token: stored.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Blogger token refresh failed: ${res.status} — ${err}`)
  }

  const data = await res.json()
  await saveToken('blogger', {
    access_token: data.access_token,
    refresh_token: stored.refresh_token, // Google doesn't always return a new refresh token
    token_type: data.token_type,
    expires_in: data.expires_in,
    scope: data.scope,
    raw: data,
  })

  return data.access_token
}

// Tumblr uses OAuth 1.0a with env vars (TUMBLR_TOKEN, TUMBLR_TOKEN_SECRET).
// Tokens are permanent — no refresh or DB storage needed.
