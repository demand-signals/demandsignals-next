// POST /api/book/create
//
// Public unauth endpoint that creates a booking from the /book page.
// Wraps bookSlot({ source: 'public_book', ... }) (§23 primitive).
// Honeypot + apiGuard (content-type + origin + rate-limit).

import { NextRequest, NextResponse } from 'next/server'
import { bookSlot } from '@/lib/bookings'
import { apiGuard, isValidEmail, sanitizeField, safeErrorResponse } from '@/lib/api-security'

export async function POST(req: NextRequest) {
  const guard = apiGuard(req)
  if (guard) return guard

  try {
    const body = await req.json()

    // Honeypot — bots fill every field, humans never see the hidden one
    const honeypot = sanitizeField(body.website, 200)
    if (honeypot) {
      // Pretend success so bots don't retry
      return NextResponse.json({ ok: true })
    }

    const slot_id = sanitizeField(body.slot_id, 500)
    const attendee_email = sanitizeField(body.attendee_email, 254)
    const attendee_name = sanitizeField(body.attendee_name, 200)
    const context_for_summary = sanitizeField(body.context_for_summary, 500)
    const context_for_description = sanitizeField(body.context_for_description, 2000)

    if (!slot_id) {
      return NextResponse.json({ ok: false, error: 'Slot is required.' }, { status: 400 })
    }
    if (!attendee_email || !isValidEmail(attendee_email)) {
      return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 400 })
    }

    const result = await bookSlot({
      slot_id,
      attendee_email,
      attendee_name: attendee_name || undefined,
      source: 'public_book',
      context_for_summary: context_for_summary || undefined,
      context_for_description: context_for_description || undefined,
    })

    if (!result.ok) {
      const status =
        result.reason === 'invalid_slot' ? 400 :
        result.reason === 'invalid_email' ? 400 :
        result.reason === 'slot_taken' ? 409 :
        result.reason === 'calendar_disconnected' ? 503 :
        500
      const message =
        result.reason === 'invalid_slot' ? 'That time slot is no longer available. Please pick another.' :
        result.reason === 'slot_taken' ? 'That time slot was just booked. Please pick another.' :
        result.reason === 'calendar_disconnected' ? 'Booking is temporarily unavailable. Please use the contact form.' :
        result.reason === 'invalid_email' ? 'A valid email is required.' :
        'Something went wrong. Please try again.'
      return NextResponse.json({ ok: false, error: message }, { status })
    }

    return NextResponse.json({
      ok: true,
      booking_id: result.booking_id,
      start_at: result.start_at,
      end_at: result.end_at,
      meet_link: result.meet_link,
    })
  } catch (err) {
    return safeErrorResponse('book_create', err)
  }
}
