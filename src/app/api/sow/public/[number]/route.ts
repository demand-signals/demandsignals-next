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
      voided_at, void_reason, deposit_invoice_id,
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

  // For accepted SOWs, look up actual delivery state of the deposit invoice
  // email so the post-accept UI can be honest ('A deposit invoice has been
  // sent.' becomes a real claim instead of marketing copy).
  let deposit_invoice_email: { sent: boolean; latest_event: string | null } | null = null
  if (sow.status === 'accepted' && sow.deposit_invoice_id) {
    const { data: latestEvent } = await supabaseAdmin
      .from('email_engagement')
      .select('event_type, occurred_at')
      .eq('invoice_id', sow.deposit_invoice_id)
      .eq('kind', 'invoice')
      .in('event_type', ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'])
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    deposit_invoice_email = {
      sent: Boolean(latestEvent && !['bounced', 'complained', 'failed'].includes(latestEvent.event_type)),
      latest_event: latestEvent?.event_type ?? null,
    }
  }

  return NextResponse.json({ sow, deposit_invoice_email })
}
