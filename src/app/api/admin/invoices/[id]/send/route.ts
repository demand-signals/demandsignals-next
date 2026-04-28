// ── POST /api/admin/invoices/[id]/send ──────────────────────────────
// Draft → sent flow. Renders PDF, uploads to R2, auto-pays on $0.
// Does NOT auto-email/SMS — use /send-sms and /send-email routes for that,
// or the dispatch flag on this endpoint.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderInvoicePdf } from '@/lib/pdf/invoice'
import { getInvoicePaymentSummary, getInvoiceProjectMeta } from '@/lib/invoice-context'
import { uploadPrivate, deletePrivate } from '@/lib/r2-storage'
import type { InvoiceWithLineItems } from '@/lib/invoice-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: invoice, error: fetchErr } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, owner_phone, address, city, state, zip)')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'draft') {
    return NextResponse.json({ error: 'Already sent' }, { status: 409 })
  }

  const { data: lineItems } = await supabaseAdmin
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Invoice has no line items' }, { status: 400 })
  }

  const renderInput: InvoiceWithLineItems = {
    ...invoice,
    line_items: lineItems,
    bill_to: {
      business_name: invoice.prospect?.business_name ?? 'Client',
      contact_name: invoice.prospect?.owner_name ?? null,
      email: invoice.prospect?.owner_email ?? null,
    },
  }

  // Resolve payment summary + project meta in parallel.
  const [paymentSummary, project] = await Promise.all([
    getInvoicePaymentSummary(invoice.id, invoice.total_due_cents),
    getInvoiceProjectMeta(invoice.id),
  ])

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderInvoicePdf(renderInput, {
      prospect: {
        business_name: invoice.prospect?.business_name ?? 'Client',
        owner_name:    invoice.prospect?.owner_name ?? null,
        owner_email:   invoice.prospect?.owner_email ?? null,
        address:       invoice.prospect?.address ?? null,
        city:          invoice.prospect?.city ?? null,
        state:         invoice.prospect?.state ?? null,
        zip:           invoice.prospect?.zip ?? null,
      },
      project,
      paymentSummary,
    })
  } catch (e) {
    return NextResponse.json(
      { error: `PDF render failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }

  const pdfKey = `invoices/${invoice.invoice_number}_v${invoice.pdf_version}.pdf`
  try {
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
  } catch (e) {
    return NextResponse.json(
      { error: `R2 upload failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }

  const isZero = invoice.total_due_cents === 0
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: isZero ? 'paid' : 'sent',
    sent_at: now,
    sent_via_channel: 'manual',
    sent_via_email_to: invoice.prospect?.owner_email ?? null,
    pdf_storage_path: pdfKey,
    pdf_rendered_at: now,
  }
  if (isZero) {
    updates.paid_at = now
    updates.paid_method = 'zero_balance'
    updates.paid_note = 'Complimentary — no payment required'
  }

  const { error: updateErr } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    await deletePrivate(pdfKey).catch(() => {})
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: id,
    channel: 'manual',
    recipient: invoice.prospect?.owner_email ?? invoice.prospect?.owner_phone ?? 'admin',
    success: true,
  })

  const publicUrl = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`

  return NextResponse.json({
    public_url: publicUrl,
    pdf_admin_url: `/api/admin/invoices/${id}/pdf`,
    pay_url: isZero
      ? null
      : `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}#pay`,
    status: isZero ? 'paid' : 'sent',
  })
}
