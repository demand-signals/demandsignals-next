import { NextResponse } from 'next/server'
import { getPortalSessionRoles } from '@/lib/portal-session'

// GET /api/me
// Returns the current user's role flags so the header can render
// the right button (admin dropdown vs client direct link).
//
// No auth gate — when unauthenticated returns { authenticated: false }.

export async function GET() {
  const roles = await getPortalSessionRoles()
  if (!roles) {
    return NextResponse.json({ authenticated: false })
  }
  return NextResponse.json({
    authenticated: true,
    isAdmin: roles.isAdmin,
    isClient: roles.isClient,
    email: roles.email,
  })
}
