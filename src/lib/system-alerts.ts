// ── system-alerts.ts ────────────────────────────────────────────────
// Writes to system_notifications + sends throttled alert email.
// Used by every subsystem that can fail in a way the admin should know about.
// See spec §4.2.
//
// Bootstrap caveat: this module sends alert emails via SMTP directly (NOT
// via @/lib/email) because:
//   1. Avoids circular dependency (email.ts also calls notify() on failure)
//   2. Avoids infinite loop if the alert send itself fails

import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface NotifyArgs {
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: string                     // 'email', 'stripe', 'cron', 'auth', etc.
  title: string                      // one-line summary
  body?: string                      // detail or stack trace
  context?: Record<string, unknown>  // structured data
  emailAlert?: boolean               // default true
}

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'DemandSignals@gmail.com'
const ALERT_FROM_FALLBACK = process.env.SMTP_USER || 'DemandSignals@gmail.com'

let smtpTransporter: nodemailer.Transporter | null = null
function smtp(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  smtpTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: parseInt(process.env.SMTP_PORT ?? '587') === 465,
    auth: { user, pass },
  })
  return smtpTransporter
}

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

  // 4. Send alert email via SMTP (never via Resend — avoids loop)
  const transporter = smtp()
  if (!transporter) {
    console.error('[notify] SMTP not configured; alert email NOT sent. Notification persisted to DB.')
    return
  }

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

  try {
    await transporter.sendMail({
      from: `Demand Signals Alerts <${ALERT_FROM_FALLBACK}>`,
      to: ALERT_EMAIL,
      subject,
      text,
    })
    // 5. Stamp emailed_at on the inserted row
    if (insertedId) {
      await supabaseAdmin
        .from('system_notifications')
        .update({ emailed_at: new Date().toISOString() })
        .eq('id', insertedId)
    }
  } catch (e) {
    // Last-resort log. The DB row is the only signal now.
    console.error('[notify] alert email send failed:', e instanceof Error ? e.message : e)
  }
}
