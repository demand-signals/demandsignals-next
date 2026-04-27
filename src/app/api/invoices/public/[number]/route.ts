// ── GET /api/invoices/public/[number]?key=<uuid> ────────────────────
// Public invoice JSON. UUID gated — always 404 on mismatch.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isStripeEnabled } from '@/lib/stripe-client'

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
    .select(`
      id, invoice_number, public_uuid, kind, status, currency, prospect_id,
      subtotal_cents, discount_cents, total_due_cents,
      due_date, send_date, sent_at, paid_at, voided_at, void_reason,
      notes, supersedes_invoice_id, superseded_by_invoice_id,
      stripe_payment_link_url, public_viewed_count,
      late_fee_cents, late_fee_grace_days, late_fee_applied_at,
      trade_credit_cents, trade_credit_description,
      payment_terms,
      prospect:prospects(business_name, owner_name, owner_email, address, city, state, zip)
    `)
    .eq('invoice_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!PUBLIC_STATUSES.includes(invoice.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('description, quantity, unit_price_cents, discount_cents, discount_label, line_total_cents, sort_order')
    .eq('invoice_id', invoice.id)
    .order('sort_order', { ascending: true })

  let superseded_by_number: string | null = null
  if (invoice.superseded_by_invoice_id) {
    const { data: superInv } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoice.superseded_by_invoice_id)
      .maybeSingle()
    superseded_by_number = superInv?.invoice_number ?? null
  }

  // First-view transition: sent → viewed.
  if (invoice.status === 'sent') {
    await supabaseAdmin
      .from('invoices')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
        public_viewed_count: (invoice.public_viewed_count ?? 0) + 1,
      })
      .eq('id', invoice.id)
  } else {
    // Increment view counter only.
    await supabaseAdmin
      .from('invoices')
      .update({ public_viewed_count: (invoice.public_viewed_count ?? 0) + 1 })
      .eq('id', invoice.id)
  }

  const stripeEnabled = await isStripeEnabled()

  return NextResponse.json({
    invoice: { ...invoice, superseded_by_number },
    line_items: lineItems ?? [],
    stripe_enabled: stripeEnabled,
  })
}
