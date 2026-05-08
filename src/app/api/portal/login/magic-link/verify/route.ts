import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  verifyMagicLinkToken,
  mintPortalSession,
  recordLoginAttempt,
  PORTAL_COOKIE_OPTIONS,
} from '@/lib/portal-auth'

// GET /api/portal/login/magic-link/verify?token=<jwt>
// Verifies token, mints session, sets dsig_portal cookie, 302 /portal.
// On any failure: log attempt, 302 /portal/login?error=<reason>.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §5
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 6.2

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

function loginErrorRedirect(request: NextRequest, reason: string): NextResponse {
  const url = new URL('/portal/login', request.url)
  url.searchParams.set('error', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return loginErrorRedirect(request, 'invalid_token')
  }

  const verified = await verifyMagicLinkToken(token)
  if (!verified.ok) {
    await recordLoginAttempt({
      email: 'unknown',
      matched: false,
      method: 'magic_link_verify',
      succeeded: false,
      failureReason: verified.reason,
      request,
    })
    return loginErrorRedirect(request, verified.reason)
  }

  // Re-verify the prospect is still a client (could have been demoted
  // between magic-link issuance and click).
  const { data: prospect } = await supabaseAdmin
    .from('prospects')
    .select('id, is_client, owner_email')
    .eq('id', verified.sub)
    .maybeSingle()

  if (!prospect || !prospect.is_client) {
    await recordLoginAttempt({
      email: verified.email,
      prospectId: verified.sub,
      matched: false,
      method: 'magic_link_verify',
      succeeded: false,
      failureReason: 'email_not_client',
      request,
    })
    return loginErrorRedirect(request, 'email_not_client')
  }

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  const userAgent = request.headers.get('user-agent') ?? null

  const minted = await mintPortalSession({
    prospectId: prospect.id,
    loginMethod: 'magic_link',
    jti: verified.jti,
    ip,
    userAgent,
  })

  if (!minted.ok) {
    await recordLoginAttempt({
      email: verified.email,
      prospectId: prospect.id,
      matched: true,
      method: 'magic_link_verify',
      succeeded: false,
      failureReason: minted.reason,
      request,
    })
    return loginErrorRedirect(request, minted.reason)
  }

  await recordLoginAttempt({
    email: verified.email,
    prospectId: prospect.id,
    matched: true,
    method: 'magic_link_verify',
    succeeded: true,
    request,
  })

  const redirect = NextResponse.redirect(new URL('/portal', SITE_URL))
  redirect.cookies.set({
    ...PORTAL_COOKIE_OPTIONS,
    value: minted.result.cookieToken,
  })
  return redirect
}
