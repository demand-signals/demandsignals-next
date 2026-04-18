// ── HTTP client for dsig-pdf-service ────────────────────────────────
// Sends invoice data to pdf.demandsignals.co, returns PDF bytes.
// Service is live and verified (pdf.demandsignals.co — Plan 2 shipped).

import type { InvoiceWithLineItems } from '../invoice-types'
import { invoiceToRenderPayload } from './payload'

export async function renderInvoicePdf(invoice: InvoiceWithLineItems): Promise<Buffer> {
  const url = process.env.PDF_SERVICE_URL
  const secret = process.env.PDF_SERVICE_SECRET
  if (!url) throw new Error('PDF_SERVICE_URL not configured')
  if (!secret) throw new Error('PDF_SERVICE_SECRET not configured')

  const res = await fetch(`${url.replace(/\/$/, '')}/api/render`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceToRenderPayload(invoice)),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`PDF service returned ${res.status}: ${errText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
