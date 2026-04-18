// ── GET /api/admin/sow/[id]/pdf ─────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select('sow_number, pdf_storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!sow.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not rendered — send first' }, { status: 409 })
  }

  const url = await getPrivateSignedUrl(sow.pdf_storage_path, 900)
  return NextResponse.redirect(url, { status: 302 })
}
