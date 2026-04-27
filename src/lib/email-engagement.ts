// ── email-engagement.ts ─────────────────────────────────────────────
// Write helpers for the email_engagement table.
// See spec §4.4 + §5.2.

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { EmailKind } from '@/lib/constants'

export interface RecordSendArgs {
  send_id: string                  // pre-generated UUID from sendEmail caller
  resend_message_id?: string | null
  kind: EmailKind
  to_address: string
  subject: string
  invoice_id?: string | null
  sow_document_id?: string | null
  receipt_id?: string | null
  prospect_id?: string | null
}

/**
 * Insert a 'sent' event row. Best-effort; failure is logged, never thrown.
 */
export async function recordSend(args: RecordSendArgs): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('email_engagement').insert({
      send_id: args.send_id,
      resend_message_id: args.resend_message_id ?? null,
      kind: args.kind,
      event_type: 'sent',
      to_address: args.to_address.toLowerCase(),
      subject: args.subject,
      invoice_id: args.invoice_id ?? null,
      sow_document_id: args.sow_document_id ?? null,
      receipt_id: args.receipt_id ?? null,
      prospect_id: args.prospect_id ?? null,
      event_data: {},
    })
    if (error) console.error('[recordSend] insert failed:', error.message)
  } catch (e) {
    console.error('[recordSend] threw:', e instanceof Error ? e.message : e)
  }
}

export interface RecordWebhookEventArgs {
  resend_message_id: string
  event_type:
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'complained'
    | 'delivery_delayed'
    | 'failed'
  occurred_at: string              // ISO timestamp from Resend payload
  event_data: Record<string, unknown>
}

/**
 * Insert a webhook-triggered event row. Idempotent via UNIQUE constraint
 * on (resend_message_id, event_type, occurred_at). On UNIQUE violation,
 * silently no-ops (this is the duplicate-delivery case).
 *
 * Looks up the originating send to copy send_id, kind, FK linkages onto
 * the new row so per-document timeline queries work without joins.
 */
export async function recordWebhookEvent(args: RecordWebhookEventArgs): Promise<void> {
  // Fetch the originating 'sent' row to copy linkage columns.
  const { data: origin } = await supabaseAdmin
    .from('email_engagement')
    .select('send_id, kind, to_address, subject, invoice_id, sow_document_id, receipt_id, prospect_id')
    .eq('resend_message_id', args.resend_message_id)
    .eq('event_type', 'sent')
    .maybeSingle()

  if (!origin) {
    console.warn(
      `[recordWebhookEvent] no originating 'sent' row for resend_message_id=${args.resend_message_id}; ` +
        `inserting orphan row`,
    )
  }

  try {
    const { error } = await supabaseAdmin.from('email_engagement').insert({
      send_id: origin?.send_id ?? crypto.randomUUID(),  // orphan gets fresh send_id
      resend_message_id: args.resend_message_id,
      kind: origin?.kind ?? 'invoice',                  // best-effort default for orphans
      event_type: args.event_type,
      to_address: origin?.to_address ?? null,
      subject: origin?.subject ?? null,
      invoice_id: origin?.invoice_id ?? null,
      sow_document_id: origin?.sow_document_id ?? null,
      receipt_id: origin?.receipt_id ?? null,
      prospect_id: origin?.prospect_id ?? null,
      event_data: args.event_data,
      occurred_at: args.occurred_at,
    })
    if (error) {
      // 23505 = unique_violation (duplicate webhook delivery — expected)
      if (error.code === '23505') return
      console.error('[recordWebhookEvent] insert failed:', error.message)
    }
  } catch (e) {
    console.error('[recordWebhookEvent] threw:', e instanceof Error ? e.message : e)
  }
}
