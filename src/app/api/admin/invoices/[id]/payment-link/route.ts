// ── POST /api/admin/invoices/[id]/payment-link ──────────────────────
// Creates or returns a cached Stripe Payment Link for the invoice.
// Called from admin UI and from the public /pay endpoint.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isStripeEnabled } from '@/lib/stripe-client'
import { ensureStripeCustomer, ensurePaymentLink } from '@/lib/stripe-sync'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  if (!(await isStripeEnabled())) {
    return NextResponse.json({ error: 'Stripe is disabled in config' }, { status: 503 })
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(id, business_name, owner_email, owner_phone)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.total_due_cents <= 0) {
    return NextResponse.json(
      { error: 'Cannot create Payment Link for zero-balance invoice' },
      { status: 400 },
    )
  }
  if (!['sent', 'viewed'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Invoice status is ${invoice.status}; must be sent or viewed` },
      { status: 409 },
    )
  }

  try {
    // Ensure Stripe customer exists (cached).
    if (invoice.prospect_id) {
      await ensureStripeCustomer(invoice.prospect_id)
    }

    const { data: lineItems } = await supabaseAdmin
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
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
    return NextResponse.json({ url: link.url, id: link.id })
  } catch (e) {
    return NextResponse.json(
      { error: `Stripe error: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }
}
