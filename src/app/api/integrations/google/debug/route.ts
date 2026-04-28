// Debug endpoint — returns the exact redirect_uri the OAuth flow is building.
// Admin-gated. Lets us verify what's being sent to Google without round-tripping
// through the consent screen. Safe: only exposes config values, no secrets.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAuthorizationUrl } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const envValue = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? null
  const fallbackValue = 'https://demandsignals.co/api/integrations/google/callback'
  const effectiveRedirectUri = envValue ?? fallbackValue

  // Build the actual URL we'd send to Google with a fake state.
  const fullAuthUrl = getAuthorizationUrl('debug-state-token')

  // Parse the redirect_uri param out of that URL — what Google will literally see.
  let redirectUriOnTheWire: string | null = null
  try {
    const u = new URL(fullAuthUrl)
    redirectUriOnTheWire = u.searchParams.get('redirect_uri')
  } catch {
    // ignore
  }

  // Inspect for whitespace gremlins.
  const envValueChars = envValue
    ? Array.from(envValue).map((c) => c.charCodeAt(0))
    : null

  return NextResponse.json({
    GOOGLE_OAUTH_REDIRECT_URI_env: envValue,
    GOOGLE_OAUTH_REDIRECT_URI_length: envValue?.length ?? null,
    GOOGLE_OAUTH_REDIRECT_URI_char_codes: envValueChars,
    fallback_value: fallbackValue,
    effective_redirect_uri: effectiveRedirectUri,
    redirect_uri_on_the_wire: redirectUriOnTheWire,
    full_auth_url: fullAuthUrl,
    GOOGLE_CLIENT_ID_first_30: (process.env.GOOGLE_CLIENT_ID ?? '').slice(0, 30),
  })
}
