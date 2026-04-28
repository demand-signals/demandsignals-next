// ── POST /api/admin/invoices/[id]/send-sms ──────────────────────────
// Send an SMS with the invoice link. Respects SMS_TEST_MODE allowlist.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio-sms'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const overridePhone: string | undefined = body.phone

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, prospect:prospects(business_name, owner_phone, business_phone)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed', 'paid'].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot SMS an invoice in status ${invoice.status}` },
      { status: 409 },
    )
  }

  // Fallback chain: explicit override → owner_phone → business_phone
  const phone =
    overridePhone ??
    invoice.prospect?.owner_phone ??
    invoice.prospect?.business_phone
  if (!phone) {
    return NextResponse.json(
      {
        error:
          'No phone number found on prospect.owner_phone or prospect.business_phone — pass an override in the request body',
      },
      { status: 400 },
    )
  }

  const businessName = invoice.prospect?.business_name ?? 'your business'
  const url = `https://demandsignals.co/invoice/${invoice.invoice_number}/${invoice.public_uuid}`
  const totalStr =
    invoice.total_due_cents === 0
      ? 'complimentary'
      : `$${(invoice.total_due_cents / 100).toFixed(2)}`

  const message = `${businessName}: Your Demand Signals invoice ${invoice.invoice_number} (${totalStr}) — ${url}`

  const result = await sendSms(phone, message)

  await supabaseAdmin.from('invoice_delivery_log').insert({
    invoice_id: id,
    channel: 'sms',
    recipient: phone,
    success: result.success,
    provider_message_id: result.message_id ?? null,
    error_message: result.error ?? null,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'SMS send failed' }, { status: 502 })
  }

  // Update sent_via_channel to reflect SMS delivery.
  await supabaseAdmin
    .from('invoices')
    .update({ sent_via_channel: invoice.sent_via_channel === 'email' ? 'both' : 'sms' })
    .eq('id', id)

  return NextResponse.json({ ok: true, message_id: result.message_id })
}
