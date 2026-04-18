// ── GET /api/invoices/public/[number]/pay?key=<uuid> ────────────────
// Public pay redirect: finds invoice by uuid gate, returns 302 to the
// Stripe Payment Link (creating one on first click). For $0 invoices,
// returns 400.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isStripeEnabled } from '@/lib/stripe-client'
import { ensureStripeCustomer, ensurePaymentLink } from '@/lib/stripe-sync'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!(await isStripeEnabled())) {
    return NextResponse.json(
      { error: 'Online payment is not available. Please contact us.' },
      { status: 503 },
    )
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(id, business_name, owner_email, owner_phone)')
    .eq('invoice_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (error || !invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Invoice is ${invoice.status} — cannot pay` },
      { status: 409 },
    )
  }
  if (invoice.total_due_cents <= 0) {
    return NextResponse.json({ error: 'Zero balance — nothing to pay' }, { status: 400 })
  }

  try {
    if (invoice.prospect_id) {
      await ensureStripeCustomer(invoice.prospect_id)
    }

    const { data: lineItems } = await supabaseAdmin
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true })

    const fullInvoice: InvoiceWithLineItems = {
      ...invoice,
      line_items: lineItems ?? [],
      bill_to: {
        business_name: invoice.prospect?.business_name ?? 'Client',
        contact_name: null,
        email: invoice.prospect?.owner_email ?? null,
      },
    }

    const link = await ensurePaymentLink(fullInvoice)
    return NextResponse.redirect(link.url, { status: 302 })
  } catch (e) {
    return NextResponse.json(
      { error: `Payment setup failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }
}
