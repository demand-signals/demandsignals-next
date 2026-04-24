// ── GET /api/admin/receipts — list ───────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sp = request.nextUrl.searchParams
  const prospectId = sp.get('prospect_id')
  const invoiceId = sp.get('invoice_id')
  const limit = Math.min(parseInt(sp.get('limit') || '50'), 200)
  const offset = parseInt(sp.get('offset') || '0')

  let q = supabaseAdmin
    .from('receipts')
    .select(
      'id, receipt_number, invoice_id, prospect_id, amount_cents, currency, payment_method, payment_reference, paid_at, notes, created_at, prospects(business_name), invoices(invoice_number)',
      { count: 'exact' },
    )
    .order('paid_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (prospectId) q = q.eq('prospect_id', prospectId)
  if (invoiceId) q = q.eq('invoice_id', invoiceId)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ receipts: data ?? [], total: count ?? 0, limit, offset })
}
