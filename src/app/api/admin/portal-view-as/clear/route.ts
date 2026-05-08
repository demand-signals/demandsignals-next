import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/portal-view-as/clear
// Clears the view-as cookie and bounces to /admin/clients.
// Intentionally allows GET so the "Stop viewing as" banner link
// works as a plain anchor. No requireAdmin gate — clearing your own
// cookie has no privilege escalation.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

export async function GET(_request: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/clients', SITE_URL))
  res.cookies.set('dsig_portal_view_as', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    domain: 'demandsignals.co',
    path: '/',
    maxAge: 0,
  })
  return res
}
