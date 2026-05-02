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
import { dispatchInvoiceEmail, dispatchInvoiceSms } from '@/lib/invoice-send'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ScheduledRow {
  id: string
  invoice_id: string
  channel: 'email' | 'sms' | 'both'
  send_at: string
  override_email: string | null
  override_phone: string | null
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: due, error } = await supabaseAdmin
    .from('invoice_scheduled_sends')
    .select('id, invoice_id, channel, send_at, override_email, override_phone')
    .eq('status', 'scheduled')
    .lte('send_at', now)
    .limit(50) // safety cap per tick — drains in subsequent runs

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{
    id: string
    channel: string
    ok: boolean
    error?: string
  }> = []

  for (const row of (due as ScheduledRow[] | null) ?? []) {
    // Race guard: take the row by flipping status off 'scheduled' first.
    // If another worker already took it, the UPDATE matches zero rows and
    // we skip dispatch entirely. The UPDATE → dispatch ordering means we
    // only mark 'fired' AFTER successful dispatch (final UPDATE below).
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from('invoice_scheduled_sends')
      .update({ status: 'failed', fired_at: new Date().toISOString() }) // tentatively failed; flip to fired on success
      .eq('id', row.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle()

    if (claimErr || !claim) {
      // Another worker won the race, or the row was cancelled in between.
      results.push({ id: row.id, channel: row.channel, ok: false, error: 'race_lost_or_cancelled' })
      continue
    }

    let emailOk = true
    let smsOk = true
    let combinedError: string | undefined

    if (row.channel === 'email' || row.channel === 'both') {
      const r = await dispatchInvoiceEmail(row.invoice_id, {
        overrideEmail: row.override_email ?? undefined,
        scheduledSendId: row.id,
        scheduledFor: row.send_at,
        createdBy: 'system',
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
      })
      smsOk = r.success
      if (!r.success) {
        combinedError = combinedError
          ? `${combinedError}; sms: ${r.error}`
          : `sms: ${r.error}`
      }
    }

    const finalOk = emailOk && smsOk
    if (finalOk) {
      await supabaseAdmin
        .from('invoice_scheduled_sends')
        .update({
          status: 'fired',
          fired_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', row.id)
    } else {
      await supabaseAdmin
        .from('invoice_scheduled_sends')
        .update({
          status: 'failed',
          fired_at: new Date().toISOString(),
          error_message: combinedError ?? 'unknown dispatch error',
        })
        .eq('id', row.id)
    }

    results.push({
      id: row.id,
      channel: row.channel,
      ok: finalOk,
      error: combinedError,
    })
  }

  return NextResponse.json({
    ran_at: now,
    found: due?.length ?? 0,
    results,
  })
}
