// GET /api/book/slots
//
// Public unauth endpoint that returns 4 signed available slots for the
// /book page. Wraps listAvailableSlots() (§23 primitive). Rate-limited
// per-IP via isRateLimited (apiGuard requires JSON content-type which
// GET doesn't carry, so we hand-roll the guard).

import { NextRequest, NextResponse } from 'next/server'
import { listAvailableSlots } from '@/lib/bookings'
import { isRateLimited, isValidOrigin, safeErrorResponse } from '@/lib/api-security'

export async function GET(req: NextRequest) {
  if (!isValidOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 })
  }
  if (isRateLimited(req)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 })
  }

  try {
    const slots = await listAvailableSlots({ count: 4, durationMinutes: 20 })
    return NextResponse.json({ ok: true, slots }, {
      headers: { 'cache-control': 'private, max-age=30' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'calendar_disconnected') {
      return NextResponse.json(
        { ok: false, error: 'Booking is temporarily unavailable. Please use the contact form.' },
        { status: 503 },
      )
    }
    // Insufficient scope on the stored refresh token. This happens when
    // the calendar was connected under a narrower scope set (e.g. the
    // pre-2026-05-14 'calendar.events' scope which doesn't cover the
    // freebusy.query API the slot-finder uses). The admin must click
    // Reconnect on /admin/integrations/google to re-grant.
    if (msg.includes('insufficientPermissions') || msg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      return NextResponse.json(
        { ok: false, error: 'Booking is temporarily unavailable. Please use the contact form.' },
        { status: 503 },
      )
    }
    return safeErrorResponse('book_slots', err)
  }
}
