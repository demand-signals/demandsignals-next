import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Allowed origins for CSRF protection on state-changing admin requests.
// Compared by parsed URL.origin (exact <scheme>://<host>[:<port>]) — NOT
// string startsWith, which would let attacker-controlled hosts that
// literally begin with an allowed value through.
const ALLOWED_ORIGINS = new Set<string>([
  'https://demandsignals.co',
  'https://www.demandsignals.co',
  'https://dsig.demandsignals.dev',
  'http://localhost:3000',
  'http://localhost:3001',
])

export async function requireAdmin(request: NextRequest) {
  // CSRF: validate on state-changing requests (POST/PATCH/DELETE/PUT).
  //
  // Tier 1: Origin header (preferred). Browsers send it on all cross-origin
  //   state-changing requests per fetch spec. We exact-match against
  //   ALLOWED_ORIGINS — never startsWith.
  //
  // Tier 2: Sec-Fetch-Site fallback. Chrome strips Origin on header-light
  //   same-origin POSTs (no body, no Content-Type). Sec-Fetch-Site is a
  //   Fetch-Metadata "forbidden" header — JS cannot set it. The browser
  //   writes it after the fetch leaves the page context, so a cross-origin
  //   attacker cannot forge it. 'same-origin' is what /admin -> /api calls
  //   produce; 'none' is what address-bar / top-level navigations produce.
  //   Both are CSRF-safe.
  //
  // Anything else (no Origin AND no acceptable Sec-Fetch-Site) is denied.
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin')
    const secFetchSite = request.headers.get('sec-fetch-site')

    if (origin) {
      let normalized: string
      try {
        normalized = new URL(origin).origin
      } catch {
        return { error: NextResponse.json({ error: 'Forbidden — invalid origin' }, { status: 403 }) }
      }
      if (!ALLOWED_ORIGINS.has(normalized)) {
        return { error: NextResponse.json({ error: 'Forbidden — invalid origin' }, { status: 403 }) }
      }
    } else if (secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
      return { error: NextResponse.json({ error: 'Forbidden — origin required' }, { status: 403 }) }
    }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, admin }
}
