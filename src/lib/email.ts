// ── email.ts ────────────────────────────────────────────────────────
// Single shared sender for all outbound mail. Resend SDK with SMTP
// fallback. Auto-BCC for client-facing kinds. Writes engagement rows.
// See spec §4.1 + §4.3 + §4.5.

import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import {
  EMAIL_FROM,
  EMAIL_REPLY_TO,
  CLIENT_FACING_KINDS,
  type EmailKind,
} from '@/lib/constants'
import { notify } from '@/lib/system-alerts'
import { recordSend } from '@/lib/email-engagement'

export interface SendEmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendEmailArgs {
  to: string | string[]
  kind: EmailKind
  subject: string
  html: string
  text?: string
  bcc?: string | string[]
  attachments?: SendEmailAttachment[]
  /** Skip alert-on-failure to break loops (used by system-alerts only). */
  suppressAlerts?: boolean
  /** Forces BCC archive on for mixed-kind callers like report_request. */
  isClientFacing?: boolean
  /**
   * Pre-generated send_id (UUID). Used when caller embeds ?e=<send_id>
   * in the email body. If omitted, sendEmail() generates one.
   */
  send_id?: string
  /** Optional FK linkage for the email_engagement 'sent' row. */
  link?: {
    invoice_id?: string
    sow_document_id?: string
    receipt_id?: string
    prospect_id?: string
  }
}

export interface SendEmailResult {
  success: boolean
  message_id?: string
  resend_message_id?: string
  send_id?: string
  provider: 'resend' | 'smtp' | 'none'
  error?: string
}

const ARCHIVE_BCC = process.env.ARCHIVE_BCC || 'DemandSignals@gmail.com'

// ── Internal helpers ────────────────────────────────────────────────

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function mergeBcc(callerBcc: string | string[] | undefined, archive: string | null): string[] {
  const set = new Set<string>()
  for (const a of asArray(callerBcc)) set.add(a.toLowerCase())
  if (archive) set.add(archive.toLowerCase())
  return Array.from(set)
}

let resendClient: Resend | null = null
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!resendClient) resendClient = new Resend(key)
  return resendClient
}

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

// ── Main export ─────────────────────────────────────────────────────

/**
 * Send an email via Resend (preferred) or SMTP (fallback).
 * NEVER throws; always returns a result.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const send_id = args.send_id ?? crypto.randomUUID()
  const from = EMAIL_FROM[args.kind]
  const replyTo = EMAIL_REPLY_TO[args.kind]
  const shouldArchive = CLIENT_FACING_KINDS.has(args.kind) || !!args.isClientFacing
  const bccList = mergeBcc(args.bcc, shouldArchive ? ARCHIVE_BCC : null)
  const toList = asArray(args.to)
  const primaryTo = toList[0] ?? ''

  const recordSendOnSuccess = (resendMessageId?: string) =>
    recordSend({
      send_id,
      resend_message_id: resendMessageId ?? null,
      kind: args.kind,
      to_address: primaryTo,
      subject: args.subject,
      invoice_id: args.link?.invoice_id ?? null,
      sow_document_id: args.link?.sow_document_id ?? null,
      receipt_id: args.link?.receipt_id ?? null,
      prospect_id: args.link?.prospect_id ?? null,
    })

  // ── Resend attempt ─────────────────────────────────────────────────
  const resendKeyMissing = !process.env.RESEND_API_KEY
  if (!resendKeyMissing) {
    const r = resend()
    if (r) {
      try {
        const result = await r.emails.send({
          from,
          to: toList,
          bcc: bccList.length > 0 ? bccList : undefined,
          replyTo: replyTo,
          subject: args.subject,
          html: args.html,
          text: args.text,
          attachments: args.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        })
        if (result.error) {
          if (!args.suppressAlerts) {
            await notify({
              severity: 'error',
              source: 'email',
              title: `Resend error sending ${args.kind}`,
              body: result.error.message,
              context: { kind: args.kind, to: primaryTo, error_code: result.error.name ?? 'unknown' },
            })
          }
          // Fall through to SMTP
        } else {
          await recordSendOnSuccess(result.data?.id)
          return {
            success: true,
            message_id: result.data?.id,
            resend_message_id: result.data?.id,
            send_id,
            provider: 'resend',
          }
        }
      } catch (e) {
        if (!args.suppressAlerts) {
          await notify({
            severity: 'error',
            source: 'email',
            title: `Resend threw sending ${args.kind}`,
            body: e instanceof Error ? e.message : String(e),
            context: { kind: args.kind, to: primaryTo, error_code: 'resend_threw' },
          })
        }
        // Fall through to SMTP
      }
    }
  }

  // ── SMTP attempt (fallback) ────────────────────────────────────────
  if (resendKeyMissing && !args.suppressAlerts) {
    await notify({
      severity: 'info',
      source: 'email',
      title: 'Resend fallback to SMTP fired',
      body: 'RESEND_API_KEY not set; using nodemailer SMTP fallback.',
      context: { kind: args.kind, to: primaryTo, error_code: 'missing_api_key' },
    })
  }

  const transporter = smtp()
  if (!transporter) {
    if (!args.suppressAlerts) {
      await notify({
        severity: 'critical',
        source: 'email',
        title: 'BOTH email providers unavailable',
        body: 'Resend failed (or missing) AND SMTP not configured. Email NOT sent.',
        context: { kind: args.kind, to: primaryTo, error_code: 'all_providers_down' },
      })
    }
    return {
      success: false,
      provider: 'none',
      send_id,
      error: 'No email provider configured or available',
    }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: toList,
      bcc: bccList.length > 0 ? bccList : undefined,
      replyTo: replyTo,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments: args.attachments,
    })
    await recordSendOnSuccess(undefined)
    return {
      success: true,
      message_id: info.messageId,
      send_id,
      provider: 'smtp',
    }
  } catch (e) {
    if (!args.suppressAlerts) {
      await notify({
        severity: 'critical',
        source: 'email',
        title: `Both Resend AND SMTP failed sending ${args.kind}`,
        body: e instanceof Error ? e.message : String(e),
        context: { kind: args.kind, to: primaryTo, error_code: 'all_providers_failed' },
      })
    }
    return {
      success: false,
      provider: 'none',
      send_id,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
