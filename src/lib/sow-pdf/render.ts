// ── HTTP client for dsig-pdf-service: SOW renderer ─────────────────

import type { SowDocument } from '../invoice-types'
import { sowToRenderPayload } from './payload'

export async function renderSowPdf(
  sow: SowDocument,
  client: { business_name: string; contact_name: string | null; email: string | null },
): Promise<Buffer> {
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
    body: JSON.stringify(sowToRenderPayload(sow, client)),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`PDF service returned ${res.status}: ${errText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
