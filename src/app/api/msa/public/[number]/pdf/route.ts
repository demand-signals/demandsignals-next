// ── GET /api/msa/public/[number]/pdf?k=<uuid> ────────────────────────
// Public MSA PDF download, gated by the public_uuid (no admin auth).
// Redirects to a signed R2 URL, or renders on demand if not yet stored.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPrivateSignedUrl } from '@/lib/r2-storage'
import { renderMsaPdf, type MsaDocument } from '@/lib/pdf/msa'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ number: string }> },
) {
  const { number } = await ctx.params
  const key = request.nextUrl.searchParams.get('k')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  const { data: msa, error } = await supabaseAdmin
    .from('msa_documents')
    .select('*, prospects!prospect_id(business_name, owner_name, owner_email)')
    .eq('msa_number', number)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!msa || msa.public_uuid !== key) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (msa.pdf_storage_path) {
    const url = await getPrivateSignedUrl(msa.pdf_storage_path, 900)
    return NextResponse.redirect(url, { status: 302 })
  }

  // Render on demand if not yet stored.
  const prospect = {
    business_name: msa.prospects?.business_name ?? msa.client_legal_name ?? 'Client',
    owner_name: msa.prospects?.owner_name ?? null,
    owner_email: msa.prospects?.owner_email ?? null,
  }
  try {
    const buf = await renderMsaPdf(msa as unknown as MsaDocument, prospect)
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${msa.msa_number}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: `Render failed: ${e instanceof Error ? e.message : e}` }, { status: 500 })
  }
}
