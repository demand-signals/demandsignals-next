// ── POST /api/admin/invoices/[id]/send-email ────────────────────────
// Send the invoice via email with PDF attached.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendInvoiceEmail } from '@/lib/invoice-email'
import { getPrivateSignedUrl } from '@/lib/r2-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const overrideEmail: string | undefined = body.email

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_email, business_email)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed', 'paid'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot email an invoice in status ${invoice.status}` },
      { status: 409 },
    )
  }

  // Fallback chain: explicit override → invoice bill_to.email → prospect.owner_email → prospect.business_email
  const billToEmail = (invoice.bill_to as { email?: string | null } | null)?.email ?? null
  const email =
    overrideEmail ??
    billToEmail ??
    invoice.prospect?.owner_email ??
    invoice.prospect?.business_email
  if (!email) {
    return NextResponse.json(
      {
        error:
          'No email address found on invoice bill_to, prospect.owner_email, or prospect.business_email — pass an override in the request body',
      },
      { status: 400 },
    )
  }

  // Fetch PDF from R2 for attachment.
  let pdfBuffer: Buffer | undefined
  if (invoice.pdf_storage_path) {
    try {
      const signed = await getPrivateSignedUrl(invoice.pdf_storage_path, 60)
      const res = await fetch(signed)
      if (res.ok) {
        const ab = await res.arrayBuffer()
        pdfBuffer = Buffer.from(ab)
      }
    } catch {
      // Fall through without attachment — email still carries the link.
    }
  }

  const result = await sendInvoiceEmail(
    invoice,
    email,
    {
      business_name: invoice.prospect?.business_name ?? undefined,
      owner_email: invoice.prospect?.owner_email ?? undefined,
    },
    pdfBuffer,
  )

  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: id,
    channel: 'email',
    recipient: email,
    success: result.success,
    provider_message_id: result.message_id ?? null,
    error_message: result.error ?? null,
  })

  await supabaseAdmin.from('invoice_email_log').insert({
    invoice_id: id,
    sent_to: email,
    success: result.success,
    smtp_message_id: result.message_id ?? null,
    error_message: result.error ?? null,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Email send failed' }, { status: 502 })
  }

  await supabaseAdmin
    .from('invoices')
    .update({
      sent_via_channel: invoice.sent_via_channel === 'sms' ? 'both' : 'email',
      sent_via_email_to: email,
    })
    .eq('id', id)

  return NextResponse.json({ ok: true, message_id: result.message_id })
}
