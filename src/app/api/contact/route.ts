import { NextRequest, NextResponse } from 'next/server'
import { CONTACT_EMAIL, getAdminTeamPhones } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/twilio-sms'
import { apiGuard, escapeHtml, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()
    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const business = sanitizeField(body.business, 200)
    const phone = sanitizeField(body.phone, 30)
    const service = sanitizeField(body.service, 100)
    const message = sanitizeField(body.message, 5000)

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const html = `
      <h2>New Contact Form Submission</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(business || '—')}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone || '—')}</td></tr>
        <tr><td><strong>Service Interest</strong></td><td>${escapeHtml(service || '—')}</td></tr>
        <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap;">${escapeHtml(message || '—')}</td></tr>
      </table>
    `

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'contact_form',
      subject: `New Contact: ${sanitizeField(body.name, 100)} — ${sanitizeField(body.business, 100) || 'No business listed'}`,
      html,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Send failed' },
        { status: 502 },
      )
    }

    // ── SMS notification to admin team (best-effort, never blocks response) ──
    // Honors quote_config.sms_delivery_enabled flag + SMS_TEST_MODE allowlist.
    // Failures surface in system_notifications so we can diagnose later.
    const smsBody = `DSIG inquiry: ${name}${business ? ` (${business})` : ''}${
      phone ? ` · ${phone}` : ''
    }${service ? ` · ${service}` : ''}\n${message ? message.slice(0, 200) : '(no message)'}\n— check email for full details`
    const adminPhones = getAdminTeamPhones()

    if (adminPhones.length === 0) {
      // notify imported lazily to avoid pulling Supabase at module-load time on routes that don't need it
      const { notify } = await import('@/lib/system-alerts')
      await notify({
        severity: 'warning',
        source: 'contact_sms',
        title: 'No admin phones configured for inquiry SMS',
        body: 'ADMIN_TEAM_PHONES env var is empty or unset; no SMS alerts dispatched.',
        context: { error_code: 'admin_phones_empty' },
      })
    } else {
      // Dispatch in parallel; await results so we can log failures.
      const results = await Promise.allSettled(adminPhones.map((p) => sendSms(p, smsBody)))
      const failures: Array<{ phone: string; error: string }> = []
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          failures.push({ phone: adminPhones[i], error: String(r.reason) })
        } else if (!r.value.success) {
          failures.push({ phone: adminPhones[i], error: r.value.error ?? 'unknown' })
        }
      })
      if (failures.length > 0) {
        const { notify } = await import('@/lib/system-alerts')
        await notify({
          severity: 'warning',
          source: 'contact_sms',
          title: `SMS dispatch failed for ${failures.length} of ${adminPhones.length} admin phones`,
          body: failures.map((f) => `${f.phone}: ${f.error}`).join('\n'),
          context: {
            failures,
            inquiry_from: name,
            error_code: failures[0].error.startsWith('SMS test mode') ? 'test_mode_block' : 'sms_send_failed',
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return safeErrorResponse('contact', err)
  }
}
