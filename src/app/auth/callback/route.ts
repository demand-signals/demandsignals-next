import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Unified Google OAuth callback. Exchanges the code for a Supabase
// session, resolves role (admin / client / both / neither), then
// routes accordingly.
//
// Routing:
//   ?redirect=<path>  → honored (e.g. middleware bouncing a user)
//   admin only        → /admin
//   client only       → /portal
//   both              → /admin (admin can switch via header dropdown)
//   neither           → /unauthorized
//
// Implementation note: a SINGLE NextResponse object is created up
// front and supabase writes session cookies directly onto it via
// setAll(). The location header is mutated AFTER role resolution to
// point at the correct target. Forwarding cookies between separate
// response objects loses scoping options and breaks the session.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitRedirect = searchParams.get('redirect')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth', origin))
  }

  // Single response — supabase mutates this object directly. We'll
  // overwrite the location header at the end.
  const response = NextResponse.redirect(new URL('/admin', origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeErr) {
    return NextResponse.redirect(new URL('/login?error=auth', origin))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.redirect(new URL('/login?error=auth', origin))
  }

  const email = user.email.toLowerCase()
  const [adminRes, clientRes] = await Promise.all([
    supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabaseAdmin
      .from('prospects')
      .select('id')
      .ilike('owner_email', email)
      .eq('is_client', true)
      .maybeSingle(),
  ])
  const isAdmin = !!adminRes.data
  const isClient = !!clientRes.data

  if (!isAdmin && !isClient) {
    return NextResponse.redirect(new URL('/unauthorized', origin))
  }

  let target: string
  if (explicitRedirect) {
    target = explicitRedirect
  } else if (isAdmin) {
    target = '/admin'
  } else {
    target = '/portal'
  }

  // Mutate the location header on the existing response. This
  // preserves all session cookies supabase wrote via setAll() with
  // their original options (path, sameSite, secure, etc.).
  response.headers.set('location', new URL(target, origin).toString())
  return response
}
