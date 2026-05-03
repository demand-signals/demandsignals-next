// ── SOW PDF regeneration ────────────────────────────────────────────
// Mirror of invoice-pdf-regenerate.ts. Used before any SOW dispatch
// (email, SMS, resend) to refresh the cached R2 PDF so the magic-link
// page Download button + the email attachment both serve current
// state instead of a snapshot from when the SOW was first issued.
//
// Best-effort: failures log but never throw to the caller.
//
// Versioning: SOW PDFs are stored at a stable key `sow/${sow_number}.pdf`
// (no version suffix). R2 PUT is atomic so the magic-link page sees
// either the old PDF or the new PDF, never a half-written file. We
// don't bump a version counter because nothing in the SOW path tracks
// pdf_version today; adding it is a separate cleanup if/when needed.

import { supabaseAdmin } from './supabase/admin'
import { renderSowPdf } from './pdf/sow'
import { uploadPrivate } from './r2-storage'
import type { SowDocument } from './invoice-types'

export async function regenerateSowPdf(sowId: string): Promise<{
  ok: boolean
  pdf_storage_path?: string
  error?: string
}> {
  try {
    const { data: sowRow, error: fetchErr } = await supabaseAdmin
      .from('sow_documents')
      .select('*, prospect:prospects(business_name, owner_name, owner_email)')
      .eq('id', sowId)
      .maybeSingle()

    if (fetchErr || !sowRow) {
      return { ok: false, error: fetchErr?.message ?? 'sow not found' }
    }

    // Only regenerate for issued SOWs. Drafts get rendered on issuance —
    // there's nothing to refresh, and rendering a draft into the live
    // R2 key would be a footgun.
    if (sowRow.status === 'draft') {
      return { ok: false, error: 'sow is still in draft — render via issueSow path instead' }
    }

    const sow = sowRow as SowDocument & {
      prospect?: {
        business_name?: string | null
        owner_name?: string | null
        owner_email?: string | null
      } | null
    }

    const pdfBuffer = await renderSowPdf(sow, {
      business_name: sow.prospect?.business_name ?? 'Client',
      owner_name: sow.prospect?.owner_name ?? null,
      owner_email: sow.prospect?.owner_email ?? null,
    })

    // Stable key — same as issueSow uses, R2 PUT overwrites atomically.
    const pdfKey = `sow/${sow.sow_number}.pdf`
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')

    await supabaseAdmin
      .from('sow_documents')
      .update({
        pdf_storage_path: pdfKey,
        pdf_rendered_at: new Date().toISOString(),
      })
      .eq('id', sowId)

    return { ok: true, pdf_storage_path: pdfKey }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}
