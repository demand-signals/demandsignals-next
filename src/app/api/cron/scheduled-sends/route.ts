// ── GET /api/cron/scheduled-sends ────────────────────────────────────
// Vercel cron, runs every 5 minutes. Finds invoice_scheduled_sends rows
// with status='scheduled' AND send_at <= now() and dispatches them.
//
// Each row → one or two dispatchInvoice* calls (email, sms, or both).
// Status flips to 'fired' on success, 'failed' on dispatch error. The
// activity timeline gets the canonical "sent" row written by the
// dispatch helpers (CLAUDE.md §D); on failure, dispatch writes a
// FAILED row and we stamp error_message on the schedule row.
//
// Idempotency: status flip is the dedup. Two concurrent cron firings
// race; the loser sees status != 'scheduled' on its second SELECT and
// skips. Same pattern as booking-reminders.
//
// Auth: Bearer token matches CRON_SECRET (Vercel Cron supplies header).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyBearerSecret } from '@/lib/bearer-auth'
import { dispatchInvoiceEmail, dispatchInvoiceSms, issueInvoice } from '@/lib/invoice-send'
import { dispatchSowEmail, dispatchSowSms, issueSow } from '@/lib/sow-send'

export const runtime = 'nodejs'
export const maxDuration = 60

interface InvoiceScheduledRow {
  id: string
  invoice_id: string
  channel: 'email' | 'sms' | 'both'
  send_at: string
  override_email: string | null
  override_phone: string | null
  kind?: 'send' | 'reminder' | 'issue_and_send'
  reminder_label?: string | null
}

interface SowScheduledRow {
  id: string
  sow_id: string
  channel: 'email' | 'sms' | 'both'
  send_at: string
  override_email: string | null
  override_phone: string | null
  kind?: 'send' | 'issue_and_send'
}

/**
 * Infer reminder tone from the label or send-time vs invoice due_date.
 * Labels we generate ourselves carry the tone-implying words; for
 * custom labels we fall back to "preemptive" which is the safest
 * neutral nudge.
 */
function inferReminderTone(label: string | null | undefined): 'preemptive' | 'past_due' | 'day_of' {
  if (!label) return 'preemptive'
  const lower = label.toLowerCase()
  if (lower.includes('past due') || lower.includes('overdue') || lower.includes('chase')) return 'past_due'
  if (lower.includes('due today') || lower.includes('day of')) return 'day_of'
  return 'preemptive'
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // ── Pull due rows from both queues in parallel ─────────────────────
  const [invoiceQ, sowQ] = await Promise.all([
    supabaseAdmin
      .from('invoice_scheduled_sends')
      .select('id, invoice_id, channel, send_at, override_email, override_phone, kind, reminder_label')
      .eq('status', 'scheduled')
      .lte('send_at', now)
      .limit(50),
    supabaseAdmin
      .from('sow_scheduled_sends')
      .select('id, sow_id, channel, send_at, override_email, override_phone, kind')
      .eq('status', 'scheduled')
      .lte('send_at', now)
      .limit(50),
  ])

  if (invoiceQ.error) {
    return NextResponse.json({ error: `invoice queue: ${invoiceQ.error.message}` }, { status: 500 })
  }
  if (sowQ.error) {
    return NextResponse.json({ error: `sow queue: ${sowQ.error.message}` }, { status: 500 })
  }

  const invoiceResults: Array<{ id: string; channel: string; ok: boolean; error?: string }> = []
  const sowResults: Array<{ id: string; channel: string; ok: boolean; error?: string }> = []

  // ── Invoice queue ──────────────────────────────────────────────────
  for (const row of (invoiceQ.data as InvoiceScheduledRow[] | null) ?? []) {
    const result = await processInvoiceRow(row)
    invoiceResults.push(result)
  }

  // ── SOW queue ──────────────────────────────────────────────────────
  for (const row of (sowQ.data as SowScheduledRow[] | null) ?? []) {
    const result = await processSowRow(row)
    sowResults.push(result)
  }

  return NextResponse.json({
    ran_at: now,
    invoices: { found: invoiceQ.data?.length ?? 0, results: invoiceResults },
    sows: { found: sowQ.data?.length ?? 0, results: sowResults },
  })
}

/**
 * Process a single invoice queue row. Race-guards via UPDATE-then-claim,
 * then either runs issue+dispatch (for kind='issue_and_send' on a draft)
 * or just dispatches (for kind='send'/'reminder' on already-issued).
 */
async function processInvoiceRow(
  row: InvoiceScheduledRow,
): Promise<{ id: string; channel: string; ok: boolean; error?: string }> {
  // Race guard: take the row by flipping status off 'scheduled' first.
  // If another worker already took it, the UPDATE matches zero rows and
  // we skip dispatch entirely.
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from('invoice_scheduled_sends')
    .update({ status: 'failed', fired_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle()

  if (claimErr || !claim) {
    return { id: row.id, channel: row.channel, ok: false, error: 'race_lost_or_cancelled' }
  }

  // ── kind='issue_and_send': issue the draft, then auto-fire dispatch.
  // The issuance helper handles PDF render, R2 upload, and status flip.
  // After issue, fall through to dispatch on the requested channel(s).
  if (row.kind === 'issue_and_send') {
    const issued = await issueInvoice(row.invoice_id, { createdBy: 'system' })
    if (!issued.success) {
      await supabaseAdmin
        .from('invoice_scheduled_sends')
        .update({
          status: 'failed',
          fired_at: new Date().toISOString(),
          error_message: `issue: ${issued.error ?? 'unknown'}`,
        })
        .eq('id', row.id)
      return { id: row.id, channel: row.channel, ok: false, error: `issue: ${issued.error}` }
    }
    // Zero-balance invoices auto-pay on issue — no dispatch needed.
    if (issued.is_zero) {
      await supabaseAdmin
        .from('invoice_scheduled_sends')
        .update({ status: 'fired', fired_at: new Date().toISOString(), error_message: null })
        .eq('id', row.id)
      return { id: row.id, channel: row.channel, ok: true }
    }
  }

  // ── Dispatch path (used by 'send', 'reminder', and post-issue 'issue_and_send').
  let emailOk = true
  let smsOk = true
  let combinedError: string | undefined

  // Reminder template only applies when kind='reminder'.
  const reminder = row.kind === 'reminder' && row.reminder_label
    ? { label: row.reminder_label, tone: inferReminderTone(row.reminder_label) }
    : undefined

  // For issue_and_send rows we just rendered fresh inside issueInvoice
  // above — skip the redundant regen-in-dispatcher step. Pure 'send' /
  // 'reminder' rows leave skipRegen unset so the dispatcher refreshes
  // R2 before the email/SMS goes out.
  const skipRegen = row.kind === 'issue_and_send'

  if (row.channel === 'email' || row.channel === 'both') {
    const r = await dispatchInvoiceEmail(row.invoice_id, {
      overrideEmail: row.override_email ?? undefined,
      scheduledSendId: row.id,
      scheduledFor: row.send_at,
      createdBy: 'system',
      reminder,
      skipRegen,
    })
    emailOk = r.success
    if (!r.success) combinedError = `email: ${r.error}`
  }

  if (row.channel === 'sms' || row.channel === 'both') {
    const r = await dispatchInvoiceSms(row.invoice_id, {
      overridePhone: row.override_phone ?? undefined,
      scheduledSendId: row.id,
      scheduledFor: row.send_at,
      createdBy: 'system',
      reminder,
      skipRegen,
    })
    smsOk = r.success
    if (!r.success) {
      combinedError = combinedError
        ? `${combinedError}; sms: ${r.error}`
        : `sms: ${r.error}`
    }
  }

  const finalOk = emailOk && smsOk
  await supabaseAdmin
    .from('invoice_scheduled_sends')
    .update({
      status: finalOk ? 'fired' : 'failed',
      fired_at: new Date().toISOString(),
      error_message: finalOk ? null : combinedError ?? 'unknown dispatch error',
    })
    .eq('id', row.id)

  return { id: row.id, channel: row.channel, ok: finalOk, error: combinedError }
}

/**
 * Process a single SOW queue row. Same race-guard + issue/dispatch
 * structure as invoices. SOW has no reminder kind.
 */
async function processSowRow(
  row: SowScheduledRow,
): Promise<{ id: string; channel: string; ok: boolean; error?: string }> {
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from('sow_scheduled_sends')
    .update({ status: 'failed', fired_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle()

  if (claimErr || !claim) {
    return { id: row.id, channel: row.channel, ok: false, error: 'race_lost_or_cancelled' }
  }

  if (row.kind === 'issue_and_send') {
    const issued = await issueSow(row.sow_id, { createdBy: 'system' })
    if (!issued.success) {
      await supabaseAdmin
        .from('sow_scheduled_sends')
        .update({
          status: 'failed',
          fired_at: new Date().toISOString(),
          error_message: `issue: ${issued.error ?? 'unknown'}`,
        })
        .eq('id', row.id)
      return { id: row.id, channel: row.channel, ok: false, error: `issue: ${issued.error}` }
    }
  }

  let emailOk = true
  let smsOk = true
  let combinedError: string | undefined

  // Same skipRegen optimization as the invoice path: when this row was
  // an issue_and_send draft, issueSow already rendered fresh — no need
  // for the dispatcher to redundantly regen. Pure resend rows refresh
  // before each dispatch.
  const skipRegen = row.kind === 'issue_and_send'

  if (row.channel === 'email' || row.channel === 'both') {
    const r = await dispatchSowEmail(row.sow_id, {
      overrideEmail: row.override_email ?? undefined,
      scheduledSendId: row.id,
      scheduledFor: row.send_at,
      createdBy: 'system',
      skipRegen,
    })
    emailOk = r.success
    if (!r.success) combinedError = `email: ${r.error}`
  }

  if (row.channel === 'sms' || row.channel === 'both') {
    const r = await dispatchSowSms(row.sow_id, {
      overridePhone: row.override_phone ?? undefined,
      scheduledSendId: row.id,
      scheduledFor: row.send_at,
      createdBy: 'system',
      skipRegen,
    })
    smsOk = r.success
    if (!r.success) {
      combinedError = combinedError
        ? `${combinedError}; sms: ${r.error}`
        : `sms: ${r.error}`
    }
  }

  const finalOk = emailOk && smsOk
  await supabaseAdmin
    .from('sow_scheduled_sends')
    .update({
      status: finalOk ? 'fired' : 'failed',
      fired_at: new Date().toISOString(),
      error_message: finalOk ? null : combinedError ?? 'unknown dispatch error',
    })
    .eq('id', row.id)

  return { id: row.id, channel: row.channel, ok: finalOk, error: combinedError }
}
