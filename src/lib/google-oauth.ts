// Google OAuth 2.0 web-app flow for the demandsignals@gmail.com calendar
// integration. The platform stores the long-lived refresh_token; access
// tokens are minted on demand by getValidAccessToken().
//
// One-time admin flow: /admin/integrations/google → start → Google →
// callback → integrations row persisted. Subsequent calendar API calls
// use the refresh token to obtain short-lived access tokens.

import { supabaseAdmin } from './supabase/admin'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
]

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID
  if (!v) throw new Error('GOOGLE_CLIENT_ID not configured')
  return v
}
function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET
  if (!v) throw new Error('GOOGLE_CLIENT_SECRET not configured')
  return v
}
function redirectUri(): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI
    ?? 'https://demandsignals.co/api/integrations/google/callback'
}

/**
 * Build the consent URL. Caller passes a CSRF state token persisted server-side
 * (we use a signed cookie + DB row).
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: 'Bearer'
  id_token?: string
}

interface DecodedIdToken {
  email?: string
  name?: string
  picture?: string
  email_verified?: boolean
}

function decodeIdTokenPayload(idToken: string): DecodedIdToken {
  const parts = idToken.split('.')
  if (parts.length !== 3) return {}
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(json) as DecodedIdToken
  } catch {
    return {}
  }
}

/**
 * Exchange the OAuth code for tokens + decode the id_token to get the
 * connected account's email. Returns everything the callback handler needs
 * to insert an integrations row.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  account_email: string
  account_name: string | null
  account_picture: string | null
  scopes: string[]
}> {
  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`token exchange failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as TokenResponse
  if (!json.refresh_token) {
    throw new Error('no refresh_token returned — confirm prompt=consent and account is fresh-consenting')
  }
  const id = json.id_token ? decodeIdTokenPayload(json.id_token) : {}
  if (!id.email) {
    throw new Error('id_token missing email claim')
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    account_email: id.email,
    account_name: id.name ?? null,
    account_picture: id.picture ?? null,
    scopes: json.scope.split(' '),
  }
}

/**
 * Returns a valid access_token for the integration. If the cached token
 * has more than 60s left, returns it; otherwise refreshes via the refresh
 * token and persists the new access token.
 */
export async function getValidAccessToken(integrationId: string): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('integrations')
    .select('id, access_token, access_token_expires_at, refresh_token, revoked_at')
    .eq('id', integrationId)
    .single()
  if (error || !row) throw new Error(`integration ${integrationId} not found`)
  if (row.revoked_at) throw new Error('integration is revoked — reconnect required')

  const now = Date.now()
  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0
  if (row.access_token && expiresAt > now + 60_000) {
    return row.access_token
  }

  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
    refresh_token: row.refresh_token,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 400 || res.status === 401) {
      await supabaseAdmin
        .from('integrations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', integrationId)
      throw new Error('refresh_token rejected by Google — integration revoked')
    }
    throw new Error(`token refresh failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as TokenResponse
  const newExpires = new Date(Date.now() + json.expires_in * 1000).toISOString()
  await supabaseAdmin
    .from('integrations')
    .update({
      access_token: json.access_token,
      access_token_expires_at: newExpires,
    })
    .eq('id', integrationId)
  return json.access_token
}

/**
 * Get the active calendar integration row id (or null if none exists).
 * Used by callers that don't have the id yet. Single-row design today
 * — first non-revoked row wins.
 */
export async function getActiveCalendarIntegration(): Promise<{
  id: string
  account_email: string
  connected_at: string
} | null> {
  const { data } = await supabaseAdmin
    .from('integrations')
    .select('id, account_email, connected_at')
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

/**
 * Revoke the integration: tells Google to invalidate the refresh token, then
 * marks the row revoked. Best-effort on the Google side — we always set
 * revoked_at locally even if the revoke call fails.
 */
export async function revokeIntegration(integrationId: string): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from('integrations')
    .select('refresh_token')
    .eq('id', integrationId)
    .single()
  if (row?.refresh_token) {
    try {
      await fetch(REVOKE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: row.refresh_token }).toString(),
      })
    } catch {
      // Best-effort.
    }
  }
  await supabaseAdmin
    .from('integrations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', integrationId)
}
