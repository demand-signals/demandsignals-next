// Real-time admin notification for hot signals on /quote sessions.
// Today: email via SMTP (already configured).
// Stage C: will add SMS via Twilio once A2P 10DLC Marketing campaign is approved.
//
// Fire-and-forget — we never want notification failure to break the user flow.

import nodemailer from 'nodemailer'
import { CONTACT_EMAIL } from './constants'
import { supabaseAdmin } from './supabase/admin'

const ADMIN_EMAIL = CONTACT_EMAIL || process.env.CONTACT_EMAIL || 'DemandSignals@gmail.com'

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export type QuoteAlertKind =
  | 'hot_walkaway'
  | 'hot_handoff'
  | 'rejected_phone_verify'
  | 'research_confirmed_high_value'

export interface QuoteAlertPayload {
  sessionId: string
  kind: QuoteAlertKind
  trigger: string
  businessName?: string | null
  businessLocation?: string | null
  websiteUrl?: string | null
  estimateLowCents?: number | null
  estimateHighCents?: number | null
  scopeSummary?: string | null
  phoneLastFour?: string | null
  email?: string | null
  shareToken?: string | null
  gbpRating?: number | null
  gbpReviewCount?: number | null
  conversationTail?: string | null
}

function formatCents(cents: number | null | undefined): string {
  if (!cents) return '—'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function subjectLine(payload: QuoteAlertPayload): string {
  const biz = payload.businessName ?? '(anonymous)'
  switch (payload.kind) {
    case 'hot_walkaway':
      return `🚨 Hot walkaway: ${biz} — reach out in next hour`
    case 'hot_handoff':
      return `🔥 Hot prospect handoff: ${biz}`
    case 'rejected_phone_verify':
      return `📞 Wants human call (not automated): ${biz}`
    case 'research_confirmed_high_value':
      return `⭐ High-value confirmed prospect: ${biz}`
  }
}

function bodyHtml(payload: QuoteAlertPayload, shareUrl: string, adminUrl: string): string {
  const biz = payload.businessName ?? '(anonymous session)'
  return `
<div style="font-family:system-ui,sans-serif;max-width:640px;">
  <h2 style="margin:0 0 8px;color:#0f172a;">${subjectLine(payload)}</h2>
  <p style="margin:0 0 16px;color:#475569;">${escapeHtml(payload.trigger)}</p>

  <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;">
    <tr><td style="color:#64748b;">Business</td><td><strong>${escapeHtml(biz)}</strong></td></tr>
    ${payload.businessLocation ? `<tr><td style="color:#64748b;">Location</td><td>${escapeHtml(payload.businessLocation)}</td></tr>` : ''}
    ${payload.websiteUrl ? `<tr><td style="color:#64748b;">Website</td><td><a href="${escapeHtml(payload.websiteUrl)}">${escapeHtml(payload.websiteUrl)}</a></td></tr>` : ''}
    ${payload.gbpRating && payload.gbpReviewCount ? `<tr><td style="color:#64748b;">Google</td><td>${payload.gbpRating.toFixed(1)}★ · ${payload.gbpReviewCount} reviews</td></tr>` : ''}
    ${payload.scopeSummary ? `<tr><td style="color:#64748b;">Scope</td><td>${escapeHtml(payload.scopeSummary)}</td></tr>` : ''}
    <tr><td style="color:#64748b;">Estimate</td><td>${formatCents(payload.estimateLowCents)}–${formatCents(payload.estimateHighCents)}</td></tr>
    ${payload.phoneLastFour ? `<tr><td style="color:#64748b;">Phone</td><td>…${escapeHtml(payload.phoneLastFour)} (verified)</td></tr>` : ''}
    ${payload.email ? `<tr><td style="color:#64748b;">Email</td><td>${escapeHtml(payload.email)}</td></tr>` : ''}
  </table>

  <div style="margin:20px 0;">
    <a href="${adminUrl}" style="display:inline-block;background:#0f172a;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;margin-right:8px;">Open in admin</a>
    <a href="${shareUrl}" style="display:inline-block;background:#68c5ad;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;">View prospect's plan</a>
  </div>

  ${payload.conversationTail ? `<hr><p style="color:#64748b;font-size:12px;margin:8px 0 4px;">Recent conversation:</p><pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap;">${escapeHtml(payload.conversationTail)}</pre>` : ''}
</div>
  `.trim()
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
    }
    return c
  })
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dsig.demandsignals.dev'

export async function sendQuoteAlert(payload: QuoteAlertPayload): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) {
    return { ok: false, error: 'SMTP not configured' }
  }
  const shareUrl = payload.shareToken ? `${SITE_URL}/quote/s/${payload.shareToken}` : SITE_URL
  const adminUrl = `${SITE_URL}/admin/quotes/${payload.sessionId}`
  try {
    await transporter.sendMail({
      from: `"DSIG Quote Alerts" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: subjectLine(payload),
      html: bodyHtml(payload, shareUrl, adminUrl),
      text: `${subjectLine(payload)}\n\n${payload.trigger}\n\nAdmin: ${adminUrl}\nShareable: ${shareUrl}`,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sendmail failed'
    return { ok: false, error: msg }
  }
}

/**
 * Build an alert payload from a quote_sessions row. Pulls the latest few
 * messages for the conversation tail. Used by tool handlers.
 */
export async function alertFromSession(
  sessionId: string,
  kind: QuoteAlertKind,
  trigger: string,
): Promise<void> {
  try {
    const { data: session } = await supabaseAdmin
      .from('quote_sessions')
      .select('id, share_token, business_name, business_location, existing_site_url, estimate_low, estimate_high, phone_last_four, email, research_findings')
      .eq('id', sessionId)
      .single()
    if (!session) return

    const findings = session.research_findings as { place?: { rating?: number; user_rating_count?: number } } | null
    const gbp = findings?.place

    const { data: scope } = await supabaseAdmin
      .from('prospects')
      .select('scope_summary')
      .eq('source_quote_session_id', sessionId)
      .maybeSingle()

    const { data: msgs } = await supabaseAdmin
      .from('quote_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(8)

    const tail = (msgs ?? [])
      .reverse()
      .map((m) => `${m.role === 'ai' ? 'AI' : m.role === 'user' ? 'Prospect' : m.role.toUpperCase()}: ${m.content.slice(0, 300).replace(/\n/g, ' ')}`)
      .join('\n')

    await sendQuoteAlert({
      sessionId: session.id,
      kind,
      trigger,
      businessName: session.business_name,
      businessLocation: session.business_location,
      websiteUrl: session.existing_site_url ?? null,
      estimateLowCents: session.estimate_low,
      estimateHighCents: session.estimate_high,
      scopeSummary: scope?.scope_summary ?? null,
      phoneLastFour: session.phone_last_four,
      email: session.email,
      shareToken: session.share_token,
      gbpRating: gbp?.rating ?? null,
      gbpReviewCount: gbp?.user_rating_count ?? null,
      conversationTail: tail || null,
    })
  } catch {
    // Fire-and-forget — never throw from notification helper.
  }
}
