// ── inquiry.ts ───────────────────────────────────────────────────────
// recordInquiry: shared core logic for /api/inquiry (quick form) and
// /api/contact (full form). Atomic prospect resolve+create+insert via
// handle_inquiry_submission() RPC, then non-atomic best-effort fan-out:
//   1. Email to admin via sendEmail()
//   2. SMS to admin team via sendSms() (per-phone, parallel)
//   3. page_visits row of type 'marketing' via logPageVisit()
//   4. Promote dsig_attr cookie if missing or stale
//
// Returns the inquiry_id + prospect_id so callers can build response
// payloads. Notification failures notify() to system_notifications but
// never fail the call — the inquiry record is the canonical artifact.

import { headers, cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/twilio-sms'
import { notify } from '@/lib/system-alerts'
import { logPageVisit, buildAttributionCookieParts } from '@/lib/page-tracking'
import { verifyAttributionCookie, ATTRIBUTION_COOKIE_NAME } from '@/lib/attribution-cookie'
import { CONTACT_EMAIL, getAdminTeamPhones } from '@/lib/constants'
import { escapeHtml } from '@/lib/api-security'

export type InquirySource = 'quick_form' | 'contact_form' | 'portal_reply'

export interface RecordInquiryArgs {
  source: InquirySource
  name: string
  email: string
  phone?: string
  business?: string
  service_interest?: string
  message?: string
  page_url: string
}

export interface RecordInquiryResult {
  ok: boolean
  inquiry_id?: string
  prospect_id?: string
  attribution_source?: 'cookie' | 'email_match' | 'new'
  error?: string
}

export async function recordInquiry(args: RecordInquiryArgs): Promise<RecordInquiryResult> {
  const h = await headers()
  const c = await cookies()

  const fwd = h.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : (h.get('x-real-ip') ?? null)
  const user_agent = h.get('user-agent') ?? null
  const referer = h.get('referer') ?? null

  const cookieValue = c.get(ATTRIBUTION_COOKIE_NAME)?.value
  const cookiePayload = await verifyAttributionCookie(cookieValue)
  const cookiePid = cookiePayload?.pid ?? null

  // ── Atomic resolve + insert ──
  const { data, error } = await supabaseAdmin
    .rpc('handle_inquiry_submission', {
      p_cookie_pid: cookiePid,
      p_source: args.source,
      p_name: args.name,
      p_email: args.email,
      p_phone: args.phone ?? null,
      p_business: args.business ?? null,
      p_service_interest: args.service_interest ?? null,
      p_message: args.message ?? null,
      p_page_url: args.page_url,
      p_referer: referer,
      p_ip: ip,
      p_user_agent: user_agent,
    })
    .single()

  if (error || !data) {
    await notify({
      severity: 'error',
      source: 'inquiry_insert',
      title: 'handle_inquiry_submission RPC failed',
      body: error?.message ?? 'no data returned',
      context: { args_source: args.source, error_code: error?.code ?? 'unknown' },
    })
    return { ok: false, error: 'Could not record inquiry. Please try again.' }
  }

  type RpcRow = {
    inquiry_id: string
    prospect_id: string
    attribution_source: 'cookie' | 'email_match' | 'new'
    was_created: boolean
  }
  const row = data as RpcRow
  const inquiry_id = row.inquiry_id
  const prospect_id = row.prospect_id
  const attribution_source = row.attribution_source

  // ── page_visits row (marketing) ──
  let page_visit_id: string | null = null
  try {
    const visit = await logPageVisit({
      page_url: args.page_url,
      page_type: 'marketing',
      attributed_prospect_id: prospect_id,
    })
    page_visit_id = visit.visit_id
    if (page_visit_id) {
      await supabaseAdmin
        .from('prospect_inquiries')
        .update({ page_visit_id })
        .eq('id', inquiry_id)
    }
  } catch (e) {
    console.error('[recordInquiry] page visit log failed:', e instanceof Error ? e.message : e)
  }

  // ── Promote attribution cookie if needed ──
  if (attribution_source !== 'cookie' && prospect_id && prospect_id !== cookiePid) {
    try {
      const parts = await buildAttributionCookieParts(prospect_id)
      if (parts) {
        c.set(parts.name, parts.value, parts.options)
      }
    } catch (e) {
      console.error('[recordInquiry] cookie set failed:', e instanceof Error ? e.message : e)
    }
  }

  // ── Notification fan-out (parallel, awaited) ──
  const emailPromise = (async () => {
    const html = `
      <h2>New ${args.source === 'quick_form' ? 'Quick Inquiry' : 'Contact Form Submission'}</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(args.name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(args.email)}">${escapeHtml(args.email)}</a></td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(args.phone || '—')}</td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(args.business || '—')}</td></tr>
        <tr><td><strong>Service Interest</strong></td><td>${escapeHtml(args.service_interest || '—')}</td></tr>
        <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap;">${escapeHtml(args.message || '—')}</td></tr>
        <tr><td><strong>Page</strong></td><td>${escapeHtml(args.page_url)}</td></tr>
        <tr><td><strong>Source</strong></td><td>${escapeHtml(args.source)}</td></tr>
        <tr><td><strong>Attribution</strong></td><td>${escapeHtml(attribution_source)}</td></tr>
      </table>
    `
    const subject =
      args.source === 'quick_form'
        ? `Quick Inquiry: ${args.name}${args.business ? ` (${args.business})` : ''}`
        : `New Contact: ${args.name} — ${args.business || 'No business listed'}`
    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'contact_form',
      subject,
      html,
      link: { prospect_id },
    })
    if (result.success && result.send_id) {
      await supabaseAdmin
        .from('prospect_inquiries')
        .update({ email_send_id: result.send_id })
        .eq('id', inquiry_id)
    }
    return result
  })()

  const smsPromise = (async () => {
    const phones = getAdminTeamPhones()
    if (phones.length === 0) {
      await notify({
        severity: 'warning',
        source: 'inquiry_sms',
        title: 'No admin phones configured for inquiry SMS',
        body: 'ADMIN_TEAM_PHONES env var is empty or unset.',
        context: { error_code: 'admin_phones_empty' },
      })
      return { dispatched: false, failures: 0 }
    }
    const body =
      `DSIG ${args.source === 'quick_form' ? 'quick' : 'full'} inquiry: ${args.name}` +
      `${args.business ? ` (${args.business})` : ''}${args.phone ? ` · ${args.phone}` : ''}` +
      ` from ${args.page_url}\n${args.message ? args.message.slice(0, 160) : '(no message)'}`
    const results = await Promise.allSettled(phones.map((p) => sendSms(p, body)))
    let failures = 0
    const failureDetail: Array<{ phone: string; error: string }> = []
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        failures++
        failureDetail.push({ phone: phones[i], error: String(r.reason) })
      } else if (!r.value.success) {
        failures++
        failureDetail.push({ phone: phones[i], error: r.value.error ?? 'unknown' })
      }
    })
    if (failures > 0) {
      await notify({
        severity: 'warning',
        source: 'inquiry_sms',
        title: `SMS dispatch failed for ${failures} of ${phones.length} admin phones`,
        body: failureDetail.map((f) => `${f.phone}: ${f.error}`).join('\n'),
        context: {
          failures: failureDetail,
          inquiry_id,
          error_code: failureDetail[0]?.error.startsWith('SMS test mode')
            ? 'test_mode_block'
            : 'sms_send_failed',
        },
      })
    }
    return { dispatched: failures < phones.length, failures }
  })()

  const [, smsOutcome] = await Promise.allSettled([emailPromise, smsPromise])
  const smsResult = smsOutcome.status === 'fulfilled' ? smsOutcome.value : { dispatched: false, failures: 999 }

  // Persist SMS outcome (best-effort)
  try {
    await supabaseAdmin
      .from('prospect_inquiries')
      .update({
        sms_dispatched: smsResult.dispatched,
        sms_failure_count: smsResult.failures,
      })
      .eq('id', inquiry_id)
  } catch (e) {
    console.error('[recordInquiry] sms outcome update failed:', e instanceof Error ? e.message : e)
  }

  return { ok: true, inquiry_id, prospect_id, attribution_source }
}
