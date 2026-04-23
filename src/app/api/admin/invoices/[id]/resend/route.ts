// ── POST /api/admin/invoices/[id]/resend ─────────────────────────────
// Resends an invoice via the same channel it was originally sent on.
// Delegates to the existing send-email or send-sms endpoint.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await ctx.params

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select('id, sent_via_channel')
    .eq('id', id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const path = inv.sent_via_channel === 'sms' ? 'send-sms' : 'send-email'
  const base = request.nextUrl.origin
  const res = await fetch(`${base}/api/admin/invoices/${id}/${path}`, {
    method: 'POST',
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Resend failed' }, { status: res.status })
  }

  return NextResponse.json({ ok: true, channel: inv.sent_via_channel })
}
