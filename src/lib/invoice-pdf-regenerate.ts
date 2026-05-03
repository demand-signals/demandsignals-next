// ── Invoice PDF regeneration ──────────────────────────────────────────
// Used after state-changing events (Stripe payment, manual mark-paid,
// void, refund) to refresh the cached PDF in R2 so future downloads
// reflect current state instead of the snapshot taken at send time.
//
// Why this exists: src/app/api/invoices/public/[number]/pdf/route.ts
// serves a static R2 file. Without regeneration, an invoice that gets
// paid still serves the unpaid PDF — confusing the client and giving
// internal workers a stale "still owed" reading.
//
// Best-effort: failures are logged but never thrown to the caller.
// Stale PDF on R2 is a minor doc-system glitch; failing the webhook
// over it would be much worse.

import { supabaseAdmin } from './supabase/admin'
import { renderInvoicePdf } from './pdf/invoice'
import { getInvoicePaymentSummary, getInvoiceProjectMeta } from './invoice-context'
import { uploadPrivate, deletePrivate } from './r2-storage'
import type { InvoiceWithLineItems } from './invoice-types'

/**
 * Re-render the PDF for an invoice using current DB state and upload it
 * to R2 with a bumped pdf_version, then update pdf_storage_path so the
 * next download serves the fresh copy.
 *
 * Idempotent — safe to call multiple times. Each call bumps the version
 * counter so concurrent calls won't trample each other's storage paths.
 */
export async function regenerateInvoicePdf(invoiceId: string): Promise<{
  ok: boolean
  pdf_storage_path?: string
  error?: string
}> {
  try {
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select(`
        id, invoice_number, public_uuid, kind, status, prospect_id,
        subtotal_cents, discount_cents, total_due_cents,
        due_date, send_date, sent_at, paid_at, paid_method, voided_at, void_reason,
        notes, late_fee_cents, late_fee_grace_days, late_fee_applied_at,
        trade_credit_cents, trade_credit_description,
        discount_kind, discount_value_bps, discount_amount_cents, discount_description,
        pdf_version,
        prospect:prospects(business_name, owner_name, owner_email, address, city, state, zip, country)
      `)
      .eq('id', invoiceId)
      .maybeSingle()

    if (invErr || !invoice) {
      return { ok: false, error: invErr?.message ?? 'invoice not found' }
    }

    const { data: lineItems } = await supabaseAdmin
      .from('invoice_line_items')
      .select('description, quantity, unit_price_cents, discount_pct, discount_label, subtotal_cents, discount_cents, line_total_cents, sort_order')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true })

    const prospect = invoice.prospect as unknown as {
      business_name?: string
      owner_name?: string | null
      owner_email?: string | null
      address?: string | null
      city?: string | null
      state?: string | null
      zip?: string | null
      country?: string | null
    } | null

    const renderInput = {
      ...invoice,
      line_items: lineItems ?? [],
      bill_to: {
        business_name: prospect?.business_name ?? 'Client',
        contact_name: prospect?.owner_name ?? null,
        email: prospect?.owner_email ?? null,
      },
    } as unknown as InvoiceWithLineItems

    const [paymentSummary, project] = await Promise.all([
      getInvoicePaymentSummary(invoice.id, invoice.total_due_cents),
      getInvoiceProjectMeta(invoice.id),
    ])

    const pdfBuffer = await renderInvoicePdf(renderInput, {
      prospect: {
        business_name: prospect?.business_name ?? 'Client',
        owner_name:    prospect?.owner_name ?? null,
        owner_email:   prospect?.owner_email ?? null,
        address:       prospect?.address ?? null,
        city:          prospect?.city ?? null,
        state:         prospect?.state ?? null,
        zip:           prospect?.zip ?? null,
        country:       prospect?.country ?? 'US',
      },
      project,
      paymentSummary,
    })

    // Bump version so the storage key is fresh.
    const oldKey = (invoice as { pdf_storage_path?: string | null }).pdf_storage_path ?? null
    const newVersion = (invoice.pdf_version ?? 1) + 1
    const pdfKey = `invoices/${invoice.invoice_number}_v${newVersion}.pdf`

    // Upload new version FIRST. If upload fails, the old PDF stays
    // intact and the next download still works (with stale state).
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')

    // Update DB to point at the new key. After this, all downloads
    // serve the fresh PDF.
    await supabaseAdmin
      .from('invoices')
      .update({
        pdf_storage_path: pdfKey,
        pdf_rendered_at: new Date().toISOString(),
        pdf_version: newVersion,
      })
      .eq('id', invoice.id)

    // Delete the old R2 file LAST so we never leave the invoice
    // pointing at a deleted path. Hunter directive 2026-04-29: each
    // regen must delete + reupload, not accumulate stale versions.
    // Best-effort — a failed delete just leaves an orphan blob in R2,
    // which is cheap and harmless. The DB is already pointed at v_new.
    if (oldKey && oldKey !== pdfKey) {
      try {
        await deletePrivate(oldKey)
      } catch (delErr) {
        console.warn(`[regenerateInvoicePdf] failed to delete old PDF ${oldKey}:`, delErr instanceof Error ? delErr.message : delErr)
      }
    }

    return { ok: true, pdf_storage_path: pdfKey }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}
