// ── POST /api/admin/sow/[id]/send ───────────────────────────────────
// Draft → sent. Renders SOW PDF via dsig-pdf-service, uploads to R2.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderSowPdf } from '@/lib/sow-pdf/render'
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
    .select('*, prospect:prospects(business_name, owner_email, owner_phone)')
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
      contact_name: null,
      email: sow.prospect?.owner_email ?? null,
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

  return NextResponse.json({
    public_url: publicUrl,
    pdf_admin_url: `/api/admin/sow/${id}/pdf`,
    status: 'sent',
  })
}
