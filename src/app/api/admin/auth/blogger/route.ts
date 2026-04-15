import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://demandsignals.co'

// GET /api/admin/auth/blogger → redirects to Google OAuth consent screen
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const clientId = process.env.BLOGGER_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'BLOGGER_CLIENT_ID not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${SITE_URL}/api/admin/auth/blogger/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/blogger',
    access_type: 'offline',    // Gets refresh_token
    prompt: 'consent',         // Forces consent screen to get refresh_token
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
