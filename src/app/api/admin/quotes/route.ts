import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const conversion = searchParams.get('conversion')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('quote_sessions')
    .select(
      'id, session_token, share_token, status, business_name, business_type, business_location, phone_verified, phone_last_four, email, estimate_low, estimate_high, monthly_low, monthly_high, accuracy_pct, conversion_action, handoff_offered, selected_items, total_cost_cents, total_tokens_used, device, referrer, utm_source, created_at, updated_at',
      { count: 'exact' },
    )

  if (status) query = query.eq('status', status)
  if (conversion) query = query.eq('conversion_action', conversion)
  if (search) {
    query = query.or(`business_name.ilike.%${search}%,phone_last_four.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count, page, limit })
}
