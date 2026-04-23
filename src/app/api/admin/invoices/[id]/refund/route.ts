// ── POST /api/admin/invoices/[id]/refund ─────────────────────────────
// Records a full or partial refund by flipping the invoice to void.
// Actual money movement is handled manually in Stripe until the integration lands.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const bodySchema = z.object({
  amount_cents: z.number().int().positive().optional(),
  reason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json().catch(() => ({})))
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select('id, total_due_cents, status')
    .eq('id', id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (inv.status !== 'paid') {
    return NextResponse.json(
      { error: `Cannot refund invoice in status ${inv.status}` },
      { status: 409 },
    )
  }

  const refundAmount = parsed.amount_cents ?? inv.total_due_cents

  // requireAdmin returns { user, admin } on success. Use user.id consistent with void/void-and-reissue.
  const voidedBy = auth.user?.id ?? null

  const { error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      void_reason: `Refund: ${parsed.reason ?? 'admin-initiated'} · ${refundAmount} cents`,
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    refund_amount_cents: refundAmount,
    note: 'Refund recorded; complete in Stripe manually until integration lands.',
  })
}
