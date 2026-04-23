// ── GET /api/admin/sow/[id]/pdf ─────────────────────────────────────
// Fast path: if pdf_storage_path exists, redirect to signed R2 URL.
// Draft path: render on-demand (no upload, no persistence) for preview.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'
import { renderSowPdf } from '@/lib/sow-pdf/render'
import type { SowDocument } from '@/lib/invoice-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select('*, prospect:prospects(*)')
    .eq('id', id)
    .maybeSingle()

  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fast path — PDF already rendered and stored
  if (sow.pdf_storage_path) {
    const url = await getPrivateSignedUrl(sow.pdf_storage_path, 900)
    return NextResponse.redirect(url, { status: 302 })
  }

  // Draft path — render on-demand, return inline, no upload
  const p = (sow as any).prospect ?? {}
  try {
    const pdfBuffer = await renderSowPdf(sow as SowDocument, {
      business_name: p.business_name ?? 'Unknown',
      contact_name: p.owner_name ?? null,
      email: p.owner_email ?? p.business_email ?? null,
    })
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="SOW-${sow.sow_number}-preview.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF render failed' },
      { status: 500 },
    )
  }
}
