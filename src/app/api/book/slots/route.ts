// GET /api/book/slots
//
// Public unauth endpoint that returns 4 signed available slots for the
// /book page. Wraps listAvailableSlots() (§23 primitive). Rate-limited
// per-IP via isRateLimited (apiGuard requires JSON content-type which
// GET doesn't carry, so we hand-roll the guard).
//
// 2026-05-15: every non-2xx path now fires notify() so the admin gets
// an alert email. After the 2-day /book outage (OAuth scope + admin
// reconnect partial-grant trap), we make sure no future booking
// failure goes unnoticed for more than a few minutes.

import { NextRequest, NextResponse } from 'next/server'
import { listAvailableSlots } from '@/lib/bookings'
import { isRateLimited, isValidOrigin, safeErrorResponse } from '@/lib/api-security'
import { notify } from '@/lib/system-alerts'

export async function GET(req: NextRequest) {
  if (!isValidOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 })
  }
  if (isRateLimited(req)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 })
  }

  try {
    const slots = await listAvailableSlots({ count: 4, durationMinutes: 20 })

    // Zero slots is itself a signal — calendar may be fully booked, or our
    // business-hours filter is too tight, or freebusy timezone math drifted.
    // Alert with severity=warning so we notice trends without firefighting.
    if (slots.length === 0) {
      await notify({
        severity: 'warning',
        source: 'book_slots',
        title: 'Booking returned zero available slots',
        body: 'listAvailableSlots() succeeded but returned an empty array. Calendar may be fully booked over the next 14 days, OR business-hours / weekday filter is rejecting all candidates.',
        context: { error_code: 'zero_slots' },
      })
    }

    return NextResponse.json({ ok: true, slots }, {
      headers: { 'cache-control': 'private, max-age=30' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Known recoverable: calendar disconnected entirely. Page shows 503 banner.
    if (msg === 'calendar_disconnected') {
      await notify({
        severity: 'error',
        source: 'book_slots',
        title: 'Booking unavailable — Google Calendar disconnected',
        body: 'getValidAccessToken() reported the integration is revoked. Admin must reconnect at /admin/integrations/google.',
        context: { error_code: 'calendar_disconnected' },
      })
      return NextResponse.json(
        { ok: false, error: 'Booking is temporarily unavailable. Please use the contact form.' },
        { status: 503 },
      )
    }

    // Insufficient scope. Catches the 2026-05-14 partial-grant trap.
    if (msg.includes('insufficientPermissions') || msg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      await notify({
        severity: 'critical',
        source: 'book_slots',
        title: 'Booking unavailable — OAuth scope insufficient',
        body: 'Calendar token lacks the broad calendar scope (freebusy.query rejected with ACCESS_TOKEN_SCOPE_INSUFFICIENT). Admin must revoke at myaccount.google.com/permissions then reconnect at /admin/integrations/google with all permission checkboxes ticked.',
        context: { error_code: 'scope_insufficient' },
      })
      return NextResponse.json(
        { ok: false, error: 'Booking is temporarily unavailable. Please use the contact form.' },
        { status: 503 },
      )
    }

    // Unhandled — most concerning case. Fire critical with the actual error.
    await notify({
      severity: 'critical',
      source: 'book_slots',
      title: 'Booking endpoint threw unhandled exception',
      body: msg,
      context: { error_code: 'unhandled_exception' },
    })
    return safeErrorResponse('book_slots', err)
  }
}
