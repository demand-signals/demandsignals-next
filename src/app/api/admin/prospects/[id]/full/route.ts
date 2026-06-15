import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  const { data: prospect, error: pErr } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const [demosRes, dealsRes] = await Promise.all([
    supabaseAdmin.from('demos').select('*').eq('prospect_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('deals').select('*').eq('prospect_id', id).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    prospect,
    demos: demosRes.data ?? [],
    deals: dealsRes.data ?? [],
  })
}
