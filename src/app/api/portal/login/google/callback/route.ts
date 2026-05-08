import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  mintPortalSession,
  recordLoginAttempt,
  PORTAL_COOKIE_OPTIONS,
} from '@/lib/portal-auth'

// GET /api/portal/login/google/callback?code=&state=
// Exchanges the auth code, decodes the id_token, looks up the email
// against prospects.is_client=true. On match: mint dsig_portal session
// and 302 to /portal. On any failure: 302 /portal/login?error=...
//
// All non-success paths use a uniform error reason ('not_a_client' or
// 'oauth_error') to prevent email enumeration.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §7
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 6.4

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

function clientId(): string {
  const v = process.env.GOOGLE_DSIG_PORTAL_ID_050726
  if (!v) throw new Error('GOOGLE_DSIG_PORTAL_ID_050726 not configured')
  return v
}
function clientSecret(): string {
  const v = process.env.GOOGLE_DSIG_PORTAL_SECRET_050726
  if (!v) throw new Error('GOOGLE_DSIG_PORTAL_SECRET_050726 not configured')
  return v
}

function loginErrorRedirect(reason: string): NextResponse {
  const url = new URL('/portal/login', SITE_URL)
  url.searchParams.set('error', reason)
  return NextResponse.redirect(url)
}

interface IdTokenPayload {
  email?: string
  email_verified?: boolean
}

function decodeIdToken(idToken: string): IdTokenPayload | null {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = Buffer.from(
      padded.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf-8')
    return JSON.parse(json) as IdTokenPayload
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const stateFromUrl = request.nextUrl.searchParams.get('state')
  const stateCookie = request.cookies.get('dsig_portal_oauth_state')?.value

  if (!code || !stateFromUrl || !stateCookie || stateFromUrl !== stateCookie) {
    await recordLoginAttempt({
      email: 'unknown',
      matched: false,
      method: 'google_callback',
      succeeded: false,
      failureReason: 'oauth_state_invalid',
      request,
    })
    return loginErrorRedirect('oauth_error')
  }

  // Exchange code for tokens
  let id_token: string | undefined
  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: `${SITE_URL}/api/portal/login/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error(`token endpoint ${tokenRes.status}`)
    const tokenJson = (await tokenRes.json()) as { id_token?: string }
    id_token = tokenJson.id_token
    if (!id_token) throw new Error('no id_token')
  } catch {
    await recordLoginAttempt({
      email: 'unknown',
      matched: false,
      method: 'google_callback',
      succeeded: false,
      failureReason: 'oauth_error',
      request,
    })
    return loginErrorRedirect('oauth_error')
  }

  const payload = decodeIdToken(id_token)
  if (!payload?.email || payload.email_verified === false) {
    await recordLoginAttempt({
      email: payload?.email ?? 'unknown',
      matched: false,
      method: 'google_callback',
      succeeded: false,
      failureReason: 'oauth_error',
      request,
    })
    return loginErrorRedirect('oauth_error')
  }

  const email = payload.email.toLowerCase().trim()

  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, is_client, owner_email')
    .ilike('owner_email', email)
    .eq('is_client', true)
    .maybeSingle()

  if (!prospect || !prospect.is_client) {
    await recordLoginAttempt({
      email,
      matched: false,
      method: 'google_callback',
      succeeded: false,
      failureReason: 'email_not_client',
      request,
    })
    return loginErrorRedirect('not_a_client')
  }

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  const userAgent = request.headers.get('user-agent') ?? null

  const minted = await mintPortalSession({
    prospectId: prospect.id,
    loginMethod: 'google_oauth',
    ip,
    userAgent,
  })

  if (!minted.ok) {
    await recordLoginAttempt({
      email,
      prospectId: prospect.id,
      matched: true,
      method: 'google_callback',
      succeeded: false,
      failureReason: minted.reason,
      request,
    })
    return loginErrorRedirect('oauth_error')
  }

  await recordLoginAttempt({
    email,
    prospectId: prospect.id,
    matched: true,
    method: 'google_callback',
    succeeded: true,
    request,
  })

  const redirect = NextResponse.redirect(new URL('/portal', SITE_URL))
  redirect.cookies.set({
    ...PORTAL_COOKIE_OPTIONS,
    value: minted.result.cookieToken,
  })
  // Clear the state cookie
  redirect.cookies.set('dsig_portal_oauth_state', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/api/portal/login',
  })
  return redirect
}
