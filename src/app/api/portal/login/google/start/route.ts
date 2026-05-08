import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

// GET /api/portal/login/google/start
// Builds the Google authorize URL with a CSRF state token (set as a
// short-lived cookie scoped to /api/portal/login) and 302s the
// browser to Google's consent screen.
//
// Uses the new "DSIG Portal" OAuth client (separate from DSIG Main
// which the calendar integration owns) — dated env-var convention
// per CLAUDE.md §12.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §7
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 6.3

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['openid', 'email']
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

function clientId(): string {
  const v = process.env.GOOGLE_PORTAL_CLIENT_ID
  if (!v) throw new Error('GOOGLE_PORTAL_CLIENT_ID not configured')
  return v
}

function redirectUri(): string {
  return process.env.GOOGLE_PORTAL_CALLBACK_URI
    ?? `${SITE_URL}/api/portal/login/google/callback`
}

export async function GET(_request: NextRequest) {
  let id: string
  try {
    id = clientId()
  } catch {
    const url = new URL('/portal/login', SITE_URL)
    url.searchParams.set('error', 'oauth_error')
    return NextResponse.redirect(url)
  }

  const state = crypto.randomBytes(16).toString('base64url')

  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'online',
    prompt: 'select_account',
    state,
  })

  const res = NextResponse.redirect(`${AUTH_ENDPOINT}?${params.toString()}`)
  res.cookies.set('dsig_portal_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/api/portal/login',
  })
  return res
}
