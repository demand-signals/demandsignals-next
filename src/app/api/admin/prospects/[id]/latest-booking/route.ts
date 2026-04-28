import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id, start_at, end_at, attendee_email, attendee_phone, google_meet_link, status')
    .eq('prospect_id', id)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return NextResponse.json({ booking: data ?? null })
}
