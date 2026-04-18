// ── /api/admin/subscriptions/[id] — detail ──────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*, prospect:prospects(*), plan:subscription_plans(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, total_due_cents, status, sent_at, paid_at, created_at')
    .eq('subscription_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ subscription: data, invoices: invoices ?? [] })
}
