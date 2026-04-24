// ── HTTP client for dsig-pdf-service ────────────────────────────────
// @deprecated Use src/lib/pdf/invoice.ts (renderInvoicePdf) instead.
// This file POSTs to the external Python PDF service (PDF_SERVICE_URL).
// The new path uses headless Chromium in-process — no external service needed.
// This file is kept for reference and will be deleted in a future cleanup commit.

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
