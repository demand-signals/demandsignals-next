// ── GET /api/admin/receipts/[id]/pdf ─────────────────────────────────
// Renders a receipt PDF on-demand via headless Chromium and streams it
// inline. Receipts are immutable, so no R2 storage path needed.

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderReceiptPdf } from '@/lib/pdf/receipt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('receipts')
    .select('*, prospects(business_name, client_code, owner_name, owner_email), invoices(invoice_number, total_due_cents, send_date)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const p = (data as any).prospects ?? {}
  const inv = (data as any).invoices ?? {}

  try {
    const pdfBuffer = await renderReceiptPdf(
      {
        id: data.id,
        receipt_number: data.receipt_number,
        invoice_id: data.invoice_id,
        prospect_id: data.prospect_id,
        amount_cents: data.amount_cents,
        currency: data.currency,
        payment_method: data.payment_method,
        payment_reference: data.payment_reference ?? null,
        paid_at: data.paid_at,
        notes: data.notes ?? null,
        created_at: data.created_at,
      },
      {
        invoice_number: inv.invoice_number ?? '—',
        total_due_cents: inv.total_due_cents ?? 0,
        send_date: inv.send_date ?? null,
      },
      {
        business_name: p.business_name ?? 'Client',
        client_code: p.client_code ?? null,
        owner_name: p.owner_name ?? null,
        owner_email: p.owner_email ?? null,
      },
    )

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Receipt-${data.receipt_number}.pdf"`,
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
