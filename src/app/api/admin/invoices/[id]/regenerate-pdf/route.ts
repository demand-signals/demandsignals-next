// ── POST /api/admin/invoices/[id]/regenerate-pdf ────────────────────
// Force a fresh PDF render + R2 swap for an existing invoice.
//
// Reason this exists: invoices created/marked-paid BEFORE the
// auto-regen fix landed (commit 6850303) have stale PDFs cached in
// R2 that don't reflect the current paid state. This endpoint lets
// admin trigger a manual regen so historical invoices catch up.
//
// Going forward this is mostly an admin escape hatch — the Stripe
// webhook + manual mark-paid path both auto-regen on state change.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { regenerateInvoicePdf } from '@/lib/invoice-pdf-regenerate'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const result = await regenerateInvoicePdf(id)

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Regeneration failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    pdf_storage_path: result.pdf_storage_path,
  })
}
