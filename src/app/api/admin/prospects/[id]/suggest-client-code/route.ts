import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { suggestAvailableClientCode } from '@/lib/doc-numbering'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: prospect, error } = await supabaseAdmin
    .from('prospects')
    .select('business_name')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const code = await suggestAvailableClientCode(prospect.business_name, id)
  return NextResponse.json({ code })
}
