// ── GET /api/admin/invoices/[id]/pdf — admin signed-URL redirect ────
// Fast path: if pdf_storage_path exists, redirect to signed R2 URL.
// Draft path: render on-demand via headless Chromium (no upload, no persistence).

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'
import { renderInvoicePdf } from '@/lib/pdf/invoice'
import { getInvoicePaymentSummary, getInvoiceProjectMeta } from '@/lib/invoice-context'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, owner_phone, address, city, state, zip)')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fast path — PDF already rendered and stored
  if (invoice.pdf_storage_path) {
    const url = await getPrivateSignedUrl(invoice.pdf_storage_path, 900)
    return NextResponse.redirect(url, { status: 302 })
  }

  // Draft path — render on-demand, return inline, no upload
  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Invoice has no line items — add at least one before previewing' }, { status: 400 })
  }

  const p = (invoice as any).prospect ?? {}
  const renderInput: InvoiceWithLineItems = {
    ...invoice,
    line_items: lineItems,
    bill_to: {
      business_name: p.business_name ?? 'Client',
      contact_name: p.owner_name ?? null,
      email: p.owner_email ?? null,
    },
  }

  // Resolve payment summary (from receipts) + project meta in parallel.
  const [paymentSummary, project] = await Promise.all([
    getInvoicePaymentSummary(invoice.id, invoice.total_due_cents),
    getInvoiceProjectMeta(invoice.id),
  ])

  try {
    const pdfBuffer = await renderInvoicePdf(renderInput, {
      prospect: {
        business_name: p.business_name ?? 'Client',
        owner_name:    p.owner_name ?? null,
        owner_email:   p.owner_email ?? null,
        address:       p.address ?? null,
        city:          p.city ?? null,
        state:         p.state ?? null,
        zip:           p.zip ?? null,
      },
      project,
      paymentSummary,
    })
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice-${invoice.invoice_number}-preview.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF render failed' },
      { status: 500 },
    )
  }
}
