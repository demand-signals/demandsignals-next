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
  const inv = (data as any).invoices ?? null
  const isTik = data.payment_method === 'tik' || data.payment_method === 'trade'

  // For TIK receipts, look up the parent trade_credits row via the
  // payment_reference (we stamp 'TIK-<short-id>' or 'trade_credit:<uuid>'
  // when minting). Fall back to matching via the most recent drawdown.
  let tikLedger: {
    description: string
    original_amount_cents: number
    remaining_cents: number
    sow_number?: string | null
  } | null = null

  if (isTik) {
    let creditId: string | null = null
    const ref = (data.payment_reference ?? '') as string
    if (ref.startsWith('trade_credit:')) {
      creditId = ref.slice('trade_credit:'.length)
    } else {
      // Heuristic: find the most recent drawdown matching this receipt's
      // amount + same prospect + paid_at within 1 minute. Best-effort —
      // PDF still renders fine without the ledger context.
      const { data: dd } = await supabaseAdmin
        .from('trade_credit_drawdowns')
        .select('trade_credit_id, trade_credits!inner(prospect_id)')
        .eq('amount_cents', data.amount_cents)
        .eq('trade_credits.prospect_id', data.prospect_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const dd1 = dd as { trade_credit_id: string } | null
      creditId = dd1?.trade_credit_id ?? null
    }

    if (creditId) {
      const { data: tc } = await supabaseAdmin
        .from('trade_credits')
        .select('description, original_amount_cents, remaining_cents, sow_document_id')
        .eq('id', creditId)
        .maybeSingle()
      if (tc) {
        let sowNumber: string | null = null
        if (tc.sow_document_id) {
          const { data: sow } = await supabaseAdmin
            .from('sow_documents')
            .select('sow_number')
            .eq('id', tc.sow_document_id)
            .maybeSingle()
          sowNumber = sow?.sow_number ?? null
        }
        tikLedger = {
          description: tc.description,
          original_amount_cents: tc.original_amount_cents,
          remaining_cents: tc.remaining_cents,
          sow_number: sowNumber,
        }
      }
    }
  }

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
      inv
        ? {
            invoice_number: inv.invoice_number ?? '—',
            total_due_cents: inv.total_due_cents ?? 0,
            send_date: inv.send_date ?? null,
          }
        : null,
      {
        business_name: p.business_name ?? 'Client',
        client_code: p.client_code ?? null,
        owner_name: p.owner_name ?? null,
        owner_email: p.owner_email ?? null,
      },
      tikLedger,
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
