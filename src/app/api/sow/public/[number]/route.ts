// ── GET /api/sow/public/[number]?key=<uuid> ─────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const PUBLIC_STATUSES = ['sent', 'viewed', 'accepted', 'declined', 'void']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: sow } = await supabaseAdmin
    .from('sow_documents')
    .select(`
      id, sow_number, public_uuid, status, title, scope_summary, prospect_id,
      phases, deliverables, timeline, pricing,
      trade_credit_cents, trade_credit_description,
      payment_terms, guarantees, notes,
      sent_at, viewed_at, accepted_at, accepted_signature, declined_at, decline_reason,
      voided_at, void_reason,
      prospect:prospects(business_name, owner_email)
    `)
    .eq('sow_number', number)
    .eq('public_uuid', key)
    .maybeSingle()

  if (!sow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!PUBLIC_STATUSES.includes(sow.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // First-view transition.
  if (sow.status === 'sent') {
    await supabaseAdmin
      .from('sow_documents')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', sow.id)
  }

  return NextResponse.json({ sow })
}
