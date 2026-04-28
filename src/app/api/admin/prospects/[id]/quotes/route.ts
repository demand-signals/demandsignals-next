import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('quote_sessions')
    .select('id, doc_number, status, estimate_low, estimate_high, created_at')
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ quotes: data ?? [] })
}
