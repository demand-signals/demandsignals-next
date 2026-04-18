// ── GET /api/admin/invoices/[id]/delivery-log ───────────────────────

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

  const { data: deliveryLog } = await supabaseAdmin
    .from('invoice_delivery_log')
    .select('*')
    .eq('invoice_id', id)
    .order('sent_at', { ascending: false })

  const { data: emailLog } = await supabaseAdmin
    .from('invoice_email_log')
    .select('*')
    .eq('invoice_id', id)
    .order('sent_at', { ascending: false })

  return NextResponse.json({
    delivery_log: deliveryLog ?? [],
    email_log: emailLog ?? [],
  })
}
