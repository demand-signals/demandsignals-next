import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Unified Google OAuth callback. Exchanges the code for a Supabase
// session, resolves role (admin / client / both / neither), routes
// accordingly.
//
// Implementation pattern (Supabase SSR docs):
//   1. Collect cookies from setAll() into a local array
//   2. Run exchangeCodeForSession + role lookup
//   3. Build a fresh redirect response and explicitly write each
//      collected cookie onto it with its original options
//
// This avoids the broken pattern of mutating a NextResponse.redirect
// after construction (which doesn't reliably persist headers).

interface CookieToSet {
  name: string
  value: string
  options: Parameters<NextResponse['cookies']['set']>[2]
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitRedirect = searchParams.get('redirect')

  // Collect cookies that supabase wants to write
  const collectedCookies: CookieToSet[] = []

  function buildRedirect(target: string): NextResponse {
    const res = NextResponse.redirect(new URL(target, origin))
    for (const c of collectedCookies) {
      res.cookies.set(c.name, c.value, c.options)
    }
    return res
  }

  if (!code) {
    return buildRedirect('/login?error=auth')
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) {
            // Mirror to incoming-request cookies so subsequent
            // supabase calls (getUser) within this request see the
            // refreshed token.
            request.cookies.set(c.name, c.value)
            // Stash for outbound write
            collectedCookies.push({
              name: c.name,
              value: c.value,
              options: c.options,
            })
          }
        },
      },
    },
  )

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeErr) {
    return buildRedirect('/login?error=auth')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return buildRedirect('/login?error=auth')
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
    return buildRedirect('/unauthorized')
  }

  let target: string
  if (explicitRedirect) {
    target = explicitRedirect
  } else if (isAdmin) {
    target = '/admin'
  } else {
    target = '/portal'
  }

  return buildRedirect(target)
}
