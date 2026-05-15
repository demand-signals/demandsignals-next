import { NextRequest, NextResponse } from 'next/server'
import { recordInquiry } from '@/lib/inquiry'
import { apiGuard, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'
import { notify } from '@/lib/system-alerts'

// 2026-05-15: every non-2xx response now fires notify() so the admin
// gets an alert email immediately. After the 24h InquiryStrip outage
// (DB CHECK constraint rejected source='inquiry_strip' silently for
// 6+ real visitors), we instrument the canonical lead-capture surface
// to never fail silently again.

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) {
    // apiGuard returns 415 (wrong content-type) or 403 (bad origin).
    // Both indicate a malformed client OR a security-relevant request —
    // alert so we notice if our own UI is misbehaving in production.
    await notify({
      severity: 'warning',
      source: 'inquiry_api',
      title: 'Inquiry rejected at apiGuard',
      body: `status=${guard.status} origin=${req.headers.get('origin') ?? '(none)'} ct=${req.headers.get('content-type') ?? '(none)'}`,
      context: {
        error_code: 'guard_reject',
        guard_status: guard.status,
      },
    })
    return guard
  }

  try {
    const body = await req.json()

    // Honeypot: if filled, return 200 OK with no DB write to defeat bot loops.
    const honeypot = sanitizeField(body.website, 200)
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    const name = sanitizeField(body.name, 200)
    const email = sanitizeField(body.email, 254)
    const phone = sanitizeField(body.phone, 30)
    const message = sanitizeField(body.message, 1000)
    const business = sanitizeField(body.business, 200)
    const service_interest = sanitizeField(body.service, 100)
    const page_url = sanitizeField(body.page_url, 500) || '/'
    const rawSource = typeof body.source === 'string' ? body.source : ''
    const source: 'contact_form' | 'quick_form' | 'inquiry_strip' | 'exit_intent' =
      rawSource === 'contact_form' ? 'contact_form'
      : rawSource === 'inquiry_strip' ? 'inquiry_strip'
      : rawSource === 'exit_intent' ? 'exit_intent'
      : 'quick_form'

    if (!name || !email) {
      // Bad client input — log but DON'T alert (this fires on every empty form
      // submit and would flood inbox). Only the path past validation gets
      // alerted on failure.
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    const result = await recordInquiry({
      source,
      name,
      email,
      phone: phone || undefined,
      business: business || undefined,
      service_interest: service_interest || undefined,
      message: message || undefined,
      page_url,
    })

    if (!result.ok) {
      // Real lead with valid name+email failed to record. THIS is the alert
      // path that was broken by the 052 constraint bug. recordInquiry already
      // calls notify() on the RPC failure with severity=error, but we add a
      // top-level critical alert here so it surfaces with full lead context
      // (name + email) for direct human follow-up.
      await notify({
        severity: 'critical',
        source: 'inquiry_api',
        title: `LEAD LOST: ${name} (${email}) — inquiry failed`,
        body: `Real lead submitted ${source} from ${page_url} with valid email but recordInquiry returned !ok. Detail: ${result.error ?? '(none)'}\n\nFollow up directly: ${email}${phone ? ` · ${phone}` : ''}\nMessage: ${message || '(no message)'}`,
        context: {
          error_code: 'record_inquiry_failed',
          source,
          page_url,
          name,
          email,
          phone,
          message,
          business,
          service_interest,
        },
      })
      return NextResponse.json(
        { success: false, error: result.error ?? 'Could not record inquiry.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // Unhandled exception path. Fire critical so we know about it.
    await notify({
      severity: 'critical',
      source: 'inquiry_api',
      title: 'Inquiry endpoint threw unhandled exception',
      body: err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err),
      context: { error_code: 'unhandled_exception' },
    })
    return safeErrorResponse('inquiry', err)
  }
}
