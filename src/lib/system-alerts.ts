// ── system-alerts.ts ────────────────────────────────────────────────
// Writes to system_notifications + sends throttled alert email.
// Used by every subsystem that can fail in a way the admin should know about.
// See spec §4.2.
//
// 2026-05-15: migrated from SMTP/nodemailer to Resend via sendEmail.
// Background: the original SMTP path went silent after the Resend
// migration (Vercel doesn't have SMTP_* env vars), so every notify()
// call wrote a row but no email ever sent. Discovered when Hunter's
// PostHog review caught a real lead bounce after the InquiryStrip
// constraint bug had been silently rejecting visitors for 24h+.
//
// Circular-dependency safety: sendEmail() accepts a `suppressAlerts`
// flag specifically for this caller. If sendEmail fails it returns
// `{ success: false }` instead of throwing OR re-calling notify(),
// so there's no infinite loop. Last-resort logging falls back to
// console.error if the email path fails.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export interface NotifyArgs {
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: string                     // 'email', 'stripe', 'cron', 'auth', etc.
  title: string                      // one-line summary
  body?: string                      // detail or stack trace
  context?: Record<string, unknown>  // structured data
  emailAlert?: boolean               // default true
}

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'DemandSignals@gmail.com'

/**
 * Write a system_notifications row + (unless suppressed) send a throttled
 * alert email to ALERT_EMAIL. Never throws — failures are console.error'd.
 *
 * Throttle: dedupe alert emails per (source, error_code) per 60-second window.
 * DB rows are always written; only the email is throttled.
 */
export async function notify(args: NotifyArgs): Promise<void> {
  const ctx = args.context ?? {}
  const errorCode = String(ctx.error_code ?? 'none')

  // 1. INSERT system_notifications row (best-effort)
  let insertedId: string | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('system_notifications')
      .insert({
        severity: args.severity,
        source: args.source,
        title: args.title,
        body: args.body ?? null,
        context: ctx,
      })
      .select('id')
      .single()
    if (error) {
      console.error('[notify] insert failed:', error.message)
    } else {
      insertedId = data?.id ?? null
    }
  } catch (e) {
    console.error('[notify] insert threw:', e instanceof Error ? e.message : e)
  }

  // 2. Skip email if explicitly suppressed
  if (args.emailAlert === false) return

  // 3. Throttle check: skip if a row in the same (source, error_code) bucket
  //    was emailed within the past 60 seconds.
  let throttled = false
  try {
    const { data } = await supabaseAdmin
      .from('system_notifications')
      .select('id')
      .eq('source', args.source)
      .eq('context->>error_code', errorCode)
      .gte('emailed_at', new Date(Date.now() - 60_000).toISOString())
      .limit(1)
    throttled = (data?.length ?? 0) > 0
  } catch (e) {
    // Throttle query failure → default to send (false-positive is better than silent)
    console.warn('[notify] throttle query failed; sending alert anyway:', e)
    throttled = false
  }
  if (throttled) return

  // 4. Send alert email via Resend (suppressAlerts breaks the cycle —
  //    sendEmail won't re-call notify() on its own failure).
  const subject = `[${args.severity}] [${args.source}] ${args.title}`
  const ctxJson = JSON.stringify(ctx, null, 2)
  const text = `Severity: ${args.severity}
Source: ${args.source}
Title: ${args.title}

Body:
${args.body ?? '(none)'}

Context:
${ctxJson}

Notification ID: ${insertedId ?? '(insert failed)'}
Time: ${new Date().toISOString()}
`
  // Lightweight HTML for readability; Resend prefers some HTML over text-only.
  const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;background:#f6f8fa;padding:16px;border-radius:8px;">${escapeHtml(text)}</pre>`

  const result = await sendEmail({
    to: ALERT_EMAIL,
    kind: 'system_alert',
    subject,
    html,
    text,
    suppressAlerts: true,  // critical: prevents alert-on-alert loops
  })

  if (!result.success) {
    // Last-resort log. The DB row is the only signal now.
    console.error('[notify] alert email send failed:', result.error ?? 'unknown', 'provider=' + result.provider)
    return
  }

  // 5. Stamp emailed_at on the inserted row
  if (insertedId) {
    try {
      await supabaseAdmin
        .from('system_notifications')
        .update({ emailed_at: new Date().toISOString() })
        .eq('id', insertedId)
    } catch (e) {
      console.error('[notify] emailed_at stamp failed:', e instanceof Error ? e.message : e)
    }
  }
}

// Minimal HTML escape; kept private to avoid pulling api-security into the
// alert path (api-security imports things that may themselves call notify()).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
