// ── POST /api/admin/invoices/[id]/void ──────────────────────────────
//
// Voids an unpaid invoice (status sent/viewed). PAID invoices are
// blocked here — admin must use the refund endpoint instead, which
// reverses the Stripe charge AND flips to void in one atomic step.
// Voiding a paid invoice without refunding would silently keep the
// money while marking the record void = accounting confusion.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const voidReason: string = (body.void_reason ?? '').trim()
  if (voidReason.length < 5) {
    return NextResponse.json(
      { error: 'void_reason must be at least 5 characters' },
      { status: 400 },
    )
  }

  // Reject voiding paid invoices — admin must refund, which both
  // reverses the Stripe charge and flips the DB to void.
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'paid') {
    return NextResponse.json(
      { error: 'Cannot void a paid invoice. Use the Refund button instead — it reverses the Stripe charge and voids the invoice in one step.' },
      { status: 409 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
      voided_by: auth.user.id,
      void_reason: voidReason,
    })
    .eq('id', id)
    .in('status', ['sent', 'viewed'])
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not voidable' }, { status: 404 })

  // Regenerate the cached PDF so the VOID stamp shows on the next
  // download. Best-effort — failures don't unwind the void.
  try {
    const { regenerateInvoicePdf } = await import('@/lib/invoice-pdf-regenerate')
    const result = await regenerateInvoicePdf(id)
    if (!result.ok) {
      console.error('[void] PDF regeneration failed:', result.error)
    }
  } catch (e) {
    console.error('[void] PDF regeneration threw:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ invoice: data })
}
