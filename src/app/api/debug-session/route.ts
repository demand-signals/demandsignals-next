import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// GET /api/debug-session
// TEMPORARY diagnostic for the cross-portal session bug. Bypasses
// admin/portal middleware (lives at the API root, not /api/admin or
// /api/portal). Returns what supabase.auth.getUser() sees from the
// cookies on this request. Hit it from the browser while signed in.
//
// DELETE this file after debugging.

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll().map((c) => ({
    name: c.name,
    valuePrefix: c.value.slice(0, 12) + '...',
    valueLen: c.value.length,
  }))

  const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))

  let userResult: unknown = null
  let userError: string | null = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() { /* no-op for diagnostic */ },
        },
      },
    )
    const { data, error } = await supabase.auth.getUser()
    userResult = data.user ? { id: data.user.id, email: data.user.email } : null
    userError = error?.message ?? null
  } catch (e) {
    userError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    note: 'TEMPORARY — delete after debugging.',
    pathname: request.nextUrl.pathname,
    cookieCount: allCookies.length,
    supabaseCookies: sbCookies,
    allCookieNames: allCookies.map((c) => c.name),
    user: userResult,
    userError,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
