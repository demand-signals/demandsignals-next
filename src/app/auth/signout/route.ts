import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// GET|POST /auth/signout
// Signs the Supabase session out, clears any view-as cookie, and
// redirects to the homepage. Idempotent.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demandsignals.co'

async function handle(request: NextRequest) {
  let response = NextResponse.redirect(new URL('/', SITE_URL))
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.redirect(new URL('/', SITE_URL))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  await supabase.auth.signOut()

  // Clear view-as cookie too
  response.cookies.set('dsig_portal_view_as', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    domain: 'demandsignals.co',
    path: '/',
    maxAge: 0,
  })
  return response
}

export async function GET(request: NextRequest) { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }
