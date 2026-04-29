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
  credit_memo_id?: string | null
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
      credit_memo_id: args.credit_memo_id ?? null,
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
    .select('send_id, kind, to_address, subject, invoice_id, sow_document_id, receipt_id, credit_memo_id, prospect_id')
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
      credit_memo_id: origin?.credit_memo_id ?? null,
      prospect_id: origin?.prospect_id ?? null,
      event_data: args.event_data,
      occurred_at: args.occurred_at,
    })
    if (error) {
      // 23505 = unique_violation (duplicate webhook delivery — expected)
      if (error.code === '23505') return
      console.error('[recordWebhookEvent] insert failed:', error.message)
      return
    }

    // Mirror the event into the prospect activities timeline so admin
    // sees email engagement alongside SOW/invoice views, bookings,
    // notes, etc. on the prospect detail page. Hunter directive
    // 2026-04-29: catch all client activity (email, web, mobile).
    if (origin?.prospect_id) {
      await mirrorEmailEventToActivities(origin, args)
    }
  } catch (e) {
    console.error('[recordWebhookEvent] threw:', e instanceof Error ? e.message : e)
  }
}

/**
 * Write a Resend webhook event into the prospect activities table.
 * Best-effort — failure logs but never breaks the webhook handler.
 *
 * Type hierarchy on activities:
 *   email_delivered, email_opened, email_clicked, email_bounced,
 *   email_complained, email_delivery_delayed, email_failed
 *
 * Hunter directive 2026-04-29 — every email engagement event hits the
 * timeline, especially Invoice/SOW opens which signal active prospect
 * attention.
 */
async function mirrorEmailEventToActivities(
  origin: {
    kind: string | null
    invoice_id: string | null
    sow_document_id: string | null
    receipt_id: string | null
    credit_memo_id: string | null
    prospect_id: string | null
    subject: string | null
    to_address: string | null
  },
  evt: RecordWebhookEventArgs,
): Promise<void> {
  if (!origin.prospect_id) return

  // Resolve a doc label if we can — the subject line is the cheapest
  // self-describing signal. Fall back to the kind.
  const docLabel = origin.subject?.trim() || origin.kind || 'email'

  // Build subject + body. Invoice/SOW opens are the high-signal
  // events Hunter explicitly flagged — give them their own subject
  // wording so they're easy to scan in the timeline.
  let subject = ''
  let body = ''
  const eventTypeKey = `email_${evt.event_type}`

  if (evt.event_type === 'opened' && origin.kind === 'invoice') {
    subject = 'Opened invoice email'
    body = `Client opened the invoice email "${docLabel}".`
  } else if (evt.event_type === 'opened' && (origin.kind === 'sow' || origin.kind === 'sow_send')) {
    subject = 'Opened SOW email'
    body = `Client opened the SOW email "${docLabel}".`
  } else if (evt.event_type === 'opened') {
    subject = `Opened email`
    body = `Client opened: "${docLabel}".`
  } else if (evt.event_type === 'clicked') {
    const clickedUrl = (evt.event_data as { url?: string; clicked_url?: string })?.url
      ?? (evt.event_data as { url?: string; clicked_url?: string })?.clicked_url
    subject = 'Clicked email link'
    body = clickedUrl
      ? `Client clicked a link in "${docLabel}": ${clickedUrl}`
      : `Client clicked a link in "${docLabel}".`
  } else if (evt.event_type === 'delivered') {
    subject = 'Email delivered'
    body = `Email "${docLabel}" delivered to ${origin.to_address ?? 'recipient'}.`
  } else if (evt.event_type === 'bounced') {
    const reason = (evt.event_data as { bounce?: { reason?: string } })?.bounce?.reason
    subject = 'Email bounced'
    body = `Email "${docLabel}" bounced${reason ? ` (${reason})` : ''}. Recipient: ${origin.to_address ?? 'unknown'}.`
  } else if (evt.event_type === 'complained') {
    subject = 'Email marked as spam'
    body = `Recipient ${origin.to_address ?? 'unknown'} marked "${docLabel}" as spam.`
  } else if (evt.event_type === 'delivery_delayed') {
    subject = 'Email delivery delayed'
    body = `Email "${docLabel}" delivery delayed.`
  } else if (evt.event_type === 'failed') {
    subject = 'Email failed'
    body = `Email "${docLabel}" failed to send.`
  } else {
    return  // unknown event type, skip
  }

  // event_data may carry IP + UA from the recipient (Resend includes
  // them on opened/clicked events). Capture both so the timeline
  // shows where the recipient is.
  const data = evt.event_data as { ip?: string; ipAddress?: string; user_agent?: string; userAgent?: string }
  const ip = data?.ip ?? data?.ipAddress ?? null
  const user_agent = data?.user_agent ?? data?.userAgent ?? null

  try {
    await supabaseAdmin.from('activities').insert({
      prospect_id: origin.prospect_id,
      type: eventTypeKey,
      channel: 'email',
      direction: 'inbound',
      subject,
      body,
      ip,
      user_agent,
      created_by: 'system',
    })
  } catch (e) {
    console.error('[mirrorEmailEventToActivities] insert threw:', e instanceof Error ? e.message : e)
  }
}
