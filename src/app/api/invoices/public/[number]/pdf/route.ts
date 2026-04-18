// ── GET /api/invoices/public/[number]/pdf?key=<uuid> ────────────────
// Public PDF download via signed R2 URL.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'

const PUBLIC_STATUSES = ['sent', 'viewed', 'paid', 'void']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('status, pdf_storage_path, invoice_number')
    .eq('invoice_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!PUBLIC_STATUSES.includes(invoice.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!invoice.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  const url = await getPrivateSignedUrl(invoice.pdf_storage_path, 900)
  return NextResponse.redirect(url, { status: 302 })
}
