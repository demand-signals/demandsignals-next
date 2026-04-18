// ── GET /api/sow/public/[number]/pdf?key=<uuid> ─────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'

const PUBLIC_STATUSES = ['sent', 'viewed', 'accepted', 'declined', 'void']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select('status, pdf_storage_path')
    .eq('sow_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!PUBLIC_STATUSES.includes(sow.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!sow.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  const url = await getPrivateSignedUrl(sow.pdf_storage_path, 900)
  return NextResponse.redirect(url, { status: 302 })
}
