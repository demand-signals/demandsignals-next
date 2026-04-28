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
  // CSRF: validate origin on state-changing requests (POST/PATCH/DELETE/PUT).
  // Modern browsers send Origin on all cross-origin state-changing requests
  // per fetch spec. A missing Origin on a mutation is either server-to-server
  // (no current admin caller does that) or a CSRF bypass attempt — deny.
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin')
    if (!origin) {
      return { error: NextResponse.json({ error: 'Forbidden — origin required' }, { status: 403 }) }
    }
    let normalized: string
    try {
      normalized = new URL(origin).origin
    } catch {
      return { error: NextResponse.json({ error: 'Forbidden — invalid origin' }, { status: 403 }) }
    }
    if (!ALLOWED_ORIGINS.has(normalized)) {
      return { error: NextResponse.json({ error: 'Forbidden — invalid origin' }, { status: 403 }) }
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
