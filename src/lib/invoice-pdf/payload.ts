// ── Map DB invoice row → PDF service JSON payload ──────────────────
// The dsig-pdf-service /api/render endpoint expects this exact shape
// for doc_type=invoice. Keep in sync with dsig_pdf/docs/invoice.py.

import type { InvoiceWithLineItems } from '../invoice-types'

export interface InvoicePdfPayload {
  doc_type: 'invoice'
  version: 1
  data: {
    invoice_number: string
    issue_date: string   // YYYY-MM-DD
    due_date: string | null
    status: string
    is_paid: boolean
    is_void: boolean
    is_zero_balance: boolean
    supersedes_number: string | null
    superseded_by_number: string | null
    bill_to: {
      business_name: string
      contact_name: string | null
      email: string | null
    }
    line_items: Array<{
      description: string
      quantity: number
      unit_price_cents: number
      line_total_cents: number
    }>
    subtotal_cents: number
    discount_cents: number
    total_due_cents: number
    notes: string | null
  }
}

export function invoiceToRenderPayload(inv: InvoiceWithLineItems): InvoicePdfPayload {
  // Sort line items by sort_order for stable rendering.
  const sortedItems = [...inv.line_items].sort((a, b) => a.sort_order - b.sort_order)

  return {
    doc_type: 'invoice',
    version: 1,
    data: {
      invoice_number: inv.invoice_number,
      issue_date: (inv.sent_at ?? inv.created_at).slice(0, 10),
      due_date: inv.due_date,
      status: inv.status,
      is_paid: inv.status === 'paid',
      is_void: inv.status === 'void',
      is_zero_balance: inv.total_due_cents === 0,
      supersedes_number: inv.supersedes_number ?? null,
      superseded_by_number: inv.superseded_by_number ?? null,
      bill_to: inv.bill_to,
      line_items: sortedItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unit_price_cents: li.unit_price_cents,
        line_total_cents: li.line_total_cents,
      })),
      subtotal_cents: inv.subtotal_cents,
      discount_cents: inv.discount_cents,
      total_due_cents: inv.total_due_cents,
      notes: inv.notes,
    },
  }
}
