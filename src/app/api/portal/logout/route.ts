import { NextRequest, NextResponse } from 'next/server'
import {
  getPortalSession,
  revokeAllSessionsForProspect,
  PORTAL_COOKIE_NAME,
  PORTAL_COOKIE_OPTIONS_CLEAR,
} from '@/lib/portal-auth'

// POST /api/portal/logout
// Reads the dsig_portal cookie, revokes EVERY active session for the
// associated prospect (logout = sign out of every device — locked
// per spec §11), clears the cookie, redirects to /portal/login.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §5
// Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 6.5

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

async function handle(request: NextRequest) {
  const token = request.cookies.get(PORTAL_COOKIE_NAME)?.value
  if (token) {
    const session = await getPortalSession(token)
    if (session) {
      await revokeAllSessionsForProspect(session.prospectId, 'logout')
    }
  }

  const redirect = NextResponse.redirect(new URL('/portal/login', SITE_URL))
  redirect.cookies.set({
    ...PORTAL_COOKIE_OPTIONS_CLEAR,
    value: '',
  })
  return redirect
}

export async function POST(request: NextRequest) {
  return handle(request)
}

// Allow GET as a convenience (e.g. plain anchor link logout) — same
// semantics. Both fire under the portal cookie's Path=/portal scope.
export async function GET(request: NextRequest) {
  return handle(request)
}
