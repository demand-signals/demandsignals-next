// ── GET /api/invoices/public/[number]?key=<uuid> ────────────────────
// Public invoice JSON. UUID gated — always 404 on mismatch.
// When an active admin session is present, drafts are also visible
// (lets admin preview the magic-link page before sending).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isStripeEnabled } from '@/lib/stripe-client'
import { getInvoicePaymentSummary, getInvoiceProjectMeta } from '@/lib/invoice-context'
import { requireAdmin } from '@/lib/admin-auth'

const PUBLIC_STATUSES = ['sent', 'viewed', 'paid', 'void']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const SELECT = `
      id, invoice_number, public_uuid, kind, status, currency, prospect_id,
      subtotal_cents, discount_cents, total_due_cents,
      due_date, send_date, sent_at, paid_at, voided_at, void_reason,
      notes, supersedes_invoice_id, superseded_by_invoice_id,
      stripe_payment_link_url, public_viewed_count,
      late_fee_cents, late_fee_grace_days, late_fee_applied_at,
      trade_credit_cents, trade_credit_description,
      discount_kind, discount_value_bps, discount_amount_cents, discount_description,
      payment_terms,
      prospect:prospects(business_name, owner_name, owner_email, address, city, state, zip)
    `

  let { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select(SELECT)
    .eq('invoice_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  // Fallback: if the invoice_number lookup misses, try by public_uuid alone.
  // This rescues rows where the rename to INV-CLIENT-MMDDYY{A} silently
  // failed (left as PENDING-{uuid} in DB) but the number was already
  // allocated in document_numbers + handed to the customer in the magic
  // link. We verify the audit log says this row was meant to have the
  // requested number, then auto-rename and serve.
  if (!invoice) {
    const { data: byUuid } = await supabaseAdmin
      .from('invoices')
      .select(SELECT)
      .eq('public_uuid', key)
      .maybeSingle()
    if (byUuid) {
      const wantsRescue =
        byUuid.invoice_number !== number &&
        byUuid.invoice_number?.startsWith('PENDING-')
      if (wantsRescue) {
        // Confirm the audit log expects this row → number mapping.
        const { data: audit } = await supabaseAdmin
          .from('document_numbers')
          .select('document_number')
          .eq('ref_table', 'invoices')
          .eq('ref_id', byUuid.id)
          .eq('document_number', number)
          .maybeSingle()
        if (audit) {
          // Audit confirms: rename and serve.
          await supabaseAdmin
            .from('invoices')
            .update({ invoice_number: number })
            .eq('id', byUuid.id)
          byUuid.invoice_number = number
          invoice = byUuid
          console.warn(`[invoices/public] Rescued orphaned PENDING- row ${byUuid.id} → ${number}`)
        }
      }
    }
  }

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Status gate — drafts and other non-public statuses are hidden from
  // customers. Admins (active session) can preview them.
  if (!PUBLIC_STATUSES.includes(invoice.status)) {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Admin session present — fall through and serve the draft.
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

    // Admin alert on first view. Deduped by view_sms_sent_at so refreshes
    // don't re-fire. Best-effort, never blocks render.
    try {
      const { data: dedupe } = await supabaseAdmin
        .from('invoices')
        .select('view_sms_sent_at, prospect:prospects(business_name)')
        .eq('id', invoice.id)
        .maybeSingle()
      if (!dedupe?.view_sms_sent_at) {
        const { notifyAdminsBySms } = await import('@/lib/admin-sms')
        const businessName = (dedupe?.prospect as { business_name?: string } | null)?.business_name ?? 'a client'
        const amountStr = `$${(invoice.total_due_cents / 100).toFixed(2)}`
        const result = await notifyAdminsBySms({
          source: 'invoice_view',
          body: `DSIG: ${businessName} just opened invoice ${invoice.invoice_number} (${amountStr}).`,
        })
        if (result.dispatched) {
          await supabaseAdmin
            .from('invoices')
            .update({ view_sms_sent_at: new Date().toISOString() })
            .eq('id', invoice.id)
        }
      }
    } catch (e) {
      console.error('[invoices public GET] view-SMS pipeline threw:', e instanceof Error ? e.message : e)
    }
  } else {
    // Increment view counter only.
    await supabaseAdmin
      .from('invoices')
      .update({ public_viewed_count: (invoice.public_viewed_count ?? 0) + 1 })
      .eq('id', invoice.id)
  }

  const [stripeEnabled, paymentSummary, project] = await Promise.all([
    isStripeEnabled(),
    getInvoicePaymentSummary(invoice.id, invoice.total_due_cents),
    getInvoiceProjectMeta(invoice.id),
  ])

  return NextResponse.json({
    invoice: { ...invoice, superseded_by_number },
    line_items: lineItems ?? [],
    stripe_enabled: stripeEnabled,
    payment_summary: paymentSummary,
    project,
  })
}
