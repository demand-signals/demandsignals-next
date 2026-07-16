// ── GET /api/admin/msa/[id]/pdf ──────────────────────────────────────
// Serve the MSA PDF. Fast path: redirect to a signed R2 URL if already
// rendered. Draft path: render on-demand, return inline. Mirrors the
// SOW/invoice PDF routes.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'
import { renderMsaPdf, type MsaDocument } from '@/lib/pdf/msa'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { data: msaRow, error } = await supabaseAdmin
    .from('msa_documents')
    .select('*, prospect:prospects(business_name, owner_name, owner_email)')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!msaRow) return NextResponse.json({ error: 'MSA not found' }, { status: 404 })

  // Fast path — redirect to signed R2 URL.
  if (msaRow.pdf_storage_path) {
    const url = await getPrivateSignedUrl(msaRow.pdf_storage_path, 900)
    return NextResponse.redirect(url, { status: 302 })
  }

  // Draft path — render on demand.
  const msa = msaRow as unknown as MsaDocument
  const prospect = {
    business_name: msaRow.prospect?.business_name ?? msaRow.client_legal_name ?? 'Client',
    owner_name: msaRow.prospect?.owner_name ?? null,
    owner_email: msaRow.prospect?.owner_email ?? null,
  }
  try {
    const buf = await renderMsaPdf(msa, prospect)
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${msaRow.msa_number}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: `Render failed: ${e instanceof Error ? e.message : e}` }, { status: 500 })
  }
}
