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
      discount_kind, discount_value_bps, discount_amount_cents, discount_description,
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

    // Admin alert: client opened the SOW. Best-effort, deduped by
    // view_sms_sent_at so refreshes never re-fire. Wrapped in try so
    // any SMS error never breaks the customer's page render.
    try {
      const { data: dedupe } = await supabaseAdmin
        .from('sow_documents')
        .select('view_sms_sent_at, prospect:prospects(business_name)')
        .eq('id', sow.id)
        .maybeSingle()
      if (!dedupe?.view_sms_sent_at) {
        const { notifyAdminsBySms } = await import('@/lib/admin-sms')
        const businessName = (dedupe?.prospect as { business_name?: string } | null)?.business_name ?? 'a prospect'
        const result = await notifyAdminsBySms({
          source: 'sow_view',
          body: `DSIG: ${businessName} just opened SOW ${sow.sow_number}.`,
        })
        if (result.dispatched) {
          await supabaseAdmin
            .from('sow_documents')
            .update({ view_sms_sent_at: new Date().toISOString() })
            .eq('id', sow.id)
        }
      }
    } catch (e) {
      console.error('[sow public GET] view-SMS pipeline threw:', e instanceof Error ? e.message : e)
    }
  }

  // Activity timeline: log every view (deduped per IP per 24h) so the
  // prospect record shows when the client opens the SOW. Captures
  // source IP + user-agent for audit. Hunter directive 2026-04-29.
  if (sow.prospect_id) {
    try {
      const { logViewActivity } = await import('@/lib/activity-tracking')
      await logViewActivity({
        prospect_id: sow.prospect_id,
        activity_type: 'sow_view',
        doc_label: sow.sow_number,
        doc_id: sow.sow_number,
      })
    } catch (e) {
      console.error('[sow public GET] activity log threw:', e instanceof Error ? e.message : e)
    }
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
