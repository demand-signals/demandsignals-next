import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Allowed origins for CSRF protection on state-changing requests
const ALLOWED_ORIGINS = [
  'https://demandsignals.co',
  'https://www.demandsignals.co',
  'https://dsig.demandsignals.dev',
  'http://localhost:3000',
  'http://localhost:3001',
]

export async function requireAdmin(request: NextRequest) {
  // CSRF: validate origin on state-changing requests (POST/PATCH/DELETE)
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin')
    if (origin && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
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
