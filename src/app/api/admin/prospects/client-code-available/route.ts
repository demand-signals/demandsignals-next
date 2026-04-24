import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const code = request.nextUrl.searchParams.get('code')?.toUpperCase() ?? ''
  const exceptId = request.nextUrl.searchParams.get('except_id') ?? null

  if (!/^[A-Z]{4}$/.test(code)) {
    return NextResponse.json(
      { available: false, error: 'Code must be 4 letters A-Z' },
      { status: 200 },
    )
  }

  let q = supabaseAdmin
    .from('prospects')
    .select('id, business_name')
    .eq('client_code', code)
  if (exceptId) q = q.neq('id', exceptId)

  const { data, error } = await q.limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data && data.length > 0) {
    return NextResponse.json({
      available: false,
      taken_by: { id: data[0].id, business_name: data[0].business_name },
    })
  }
  return NextResponse.json({ available: true })
}
