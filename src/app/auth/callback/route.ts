import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Unified Google OAuth callback. Exchanges the code for a Supabase
// session, resolves role (admin / client / both / neither), then
// routes accordingly.
//
// Routing:
//   ?redirect=<path>  → honored (e.g. middleware bouncing a portal-bound user)
//   admin only        → /admin
//   client only       → /portal
//   both              → /admin (admin can switch via header dropdown)
//   neither           → /unauthorized

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitRedirect = searchParams.get('redirect')

  if (!code) {
    return NextResponse.redirect(new URL('/admin-login?error=auth', origin))
  }

  // We need to determine the redirect target BEFORE creating the
  // response, because Supabase's setAll() writes onto the response
  // object — so the cookies-setting closure has to capture the FINAL
  // response. We build a placeholder, exchange the code, resolve the
  // role, then mutate the response.url.
  //
  // Pattern: do the role resolution against a temp NextResponse.next(),
  // then build the redirect with the same cookies forwarded.
  let cookieResponse = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookieResponse = NextResponse.next()
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeErr) {
    return NextResponse.redirect(new URL('/admin-login?error=auth', origin))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.redirect(new URL('/admin-login?error=auth', origin))
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

  // Build the redirect, forwarding the auth cookies that supabase set
  // on cookieResponse during exchangeCodeForSession + getUser.
  const finalRedirect = NextResponse.redirect(new URL(target, origin))
  for (const cookie of cookieResponse.cookies.getAll()) {
    finalRedirect.cookies.set({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    })
  }
  return finalRedirect
}
