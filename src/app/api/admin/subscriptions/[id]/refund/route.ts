// ── POST /api/admin/subscriptions/[id]/refund ────────────────────────
// Voids the most recent paid invoice on the subscription.

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

  const body = await request.json().catch(() => ({}))
  const reason: string = body.reason ?? 'admin refund'
  const refundAmountCents: number | undefined = body.amount_cents

  // Find most recent paid invoice for this subscription
  const { data: invoice, error: fetchErr } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, total_due_cents')
    .eq('subscription_id', id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!invoice) {
    return NextResponse.json({ error: 'No paid invoice to refund' }, { status: 409 })
  }

  const { error: voidErr } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
      void_reason: `Refund (subscription): ${reason}`,
      voided_by: auth.user?.id ?? null,
    })
    .eq('id', invoice.id)

  if (voidErr) return NextResponse.json({ error: voidErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    invoice_id: invoice.id,
    refund_amount_cents: refundAmountCents ?? invoice.total_due_cents,
  })
}
