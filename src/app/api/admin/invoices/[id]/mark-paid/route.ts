// ── POST /api/admin/invoices/[id]/mark-paid ─────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_METHODS = ['check', 'wire', 'stripe', 'zero_balance', 'other'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const paid_method: string = body.paid_method ?? 'other'
  const paid_note: string | null = body.paid_note ?? null

  if (!VALID_METHODS.includes(paid_method as typeof VALID_METHODS[number])) {
    return NextResponse.json({ error: 'Invalid paid_method' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_method,
      paid_note,
    })
    .eq('id', id)
    .in('status', ['sent', 'viewed'])
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not markable' }, { status: 404 })

  return NextResponse.json({ invoice: data })
}
