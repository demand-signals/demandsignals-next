// ── POST /api/admin/sow/[id]/send ───────────────────────────────────
// Draft → sent. Renders SOW PDF via headless Chromium, uploads to R2.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderSowPdf } from '@/lib/pdf/sow'
import { sendSowEmail } from '@/lib/sow-email'
import { uploadPrivate, deletePrivate } from '@/lib/r2-storage'
import type { SowDocument } from '@/lib/invoice-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sow, error } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(business_name, owner_name, owner_email, business_email, owner_phone)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sow.status !== 'draft') {
    return NextResponse.json({ error: 'Already sent' }, { status: 409 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderSowPdf(sow as SowDocument, {
      business_name: sow.prospect?.business_name ?? 'Client',
      owner_name: null,
      owner_email: sow.prospect?.owner_email ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: `PDF render failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }

  const pdfKey = `sow/${sow.sow_number}.pdf`
  try {
    await uploadPrivate(pdfKey, pdfBuffer, 'application/pdf')
  } catch (e) {
    return NextResponse.json(
      { error: `R2 upload failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    )
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await supabaseAdmin
    .from('sow_documents')
    .update({
      status: 'sent',
      sent_at: now,
      pdf_storage_path: pdfKey,
      pdf_rendered_at: now,
    })
    .eq('id', id)

  if (updateErr) {
    await deletePrivate(pdfKey).catch(() => {})
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const publicUrl = `https://demandsignals.co/sow/${sow.sow_number}/${sow.public_uuid}`

  // Email delivery (best-effort — does not block the send response).
  // Falls back through owner_email → business_email. If neither is set, the
  // send still succeeds (admin can hand the magic link over manually).
  const recipient =
    sow.prospect?.owner_email ?? sow.prospect?.business_email ?? null
  let emailResult: { success: boolean; message_id?: string; error?: string } | null = null
  if (recipient) {
    emailResult = await sendSowEmail(
      sow as SowDocument,
      recipient,
      {
        business_name: sow.prospect?.business_name ?? undefined,
        owner_email: sow.prospect?.owner_email ?? null,
        owner_name: sow.prospect?.owner_name ?? null,
      },
      pdfBuffer,
    )
  }

  return NextResponse.json({
    public_url: publicUrl,
    pdf_admin_url: `/api/admin/sow/${id}/pdf`,
    status: 'sent',
    email: recipient
      ? {
          to: recipient,
          success: emailResult?.success ?? false,
          message_id: emailResult?.message_id ?? null,
          error: emailResult?.error ?? null,
        }
      : { to: null, success: false, error: 'No prospect email on file' },
  })
}
