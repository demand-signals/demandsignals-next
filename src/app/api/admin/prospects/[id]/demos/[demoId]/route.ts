import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// DELETE /api/admin/prospects/[id]/demos/[demoId] — remove a demo link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; demoId: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id, demoId } = await params

  const { error } = await supabaseAdmin
    .from('demos')
    .delete()
    .eq('id', demoId)
    .eq('prospect_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
