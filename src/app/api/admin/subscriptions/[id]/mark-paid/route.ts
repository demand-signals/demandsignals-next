// ── POST /api/admin/subscriptions/[id]/mark-paid ─────────────────────
// Marks the most recent unpaid invoice on the subscription as paid.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  // Find most recent unpaid invoice for this subscription
  const { data: invoice, error: fetchErr } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number')
    .eq('subscription_id', id)
    .in('status', ['sent', 'viewed', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!invoice) {
    return NextResponse.json({ error: 'No unpaid invoice to mark paid' }, { status: 409 })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_method: 'other',
      paid_note: 'Marked paid by admin (subscription cycle)',
    })
    .eq('id', invoice.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, invoice_id: invoice.id })
}
