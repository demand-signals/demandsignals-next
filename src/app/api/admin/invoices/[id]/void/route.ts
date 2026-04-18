// ── POST /api/admin/invoices/[id]/void ──────────────────────────────

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

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'void',
      voided_at: new Date().toISOString(),
      voided_by: auth.user.id,
      void_reason: voidReason,
    })
    .eq('id', id)
    .in('status', ['sent', 'viewed', 'paid'])
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not voidable' }, { status: 404 })

  return NextResponse.json({ invoice: data })
}
