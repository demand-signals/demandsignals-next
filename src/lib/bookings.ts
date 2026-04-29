// Public booking API used by quote-tools, admin reschedule, and the
// future /book public page. The single entry point for creating /
// modifying bookings rows.
//
// Phone resolution cascade (opportunistic, never blocks):
//   1. prospects.owner_phone (existing client returnees)
//   2. quote_sessions phone_encrypted (this session's verified phone)
//   3. null → SMS dispatch is silently skipped

import { supabaseAdmin } from './supabase/admin'
import { toE164, decryptPhone } from './quote-crypto'
import {
  getAvailableSlots,
  createMeetingEvent,
  cancelMeetingEvent,
  rescheduleMeetingEvent,
  type AvailableSlot,
} from './google-calendar'
import { verifySlotId } from './slot-signing'
import {
  sendBookingConfirmationToProspect,
  sendBookingNotificationToAdmin,
  sendBookingCancellationToAdmin,
} from './booking-sms'

export interface BookSlotOpts {
  slot_id: string
  attendee_email: string
  attendee_name?: string
  source: 'quote' | 'public_book' | 'admin_manual'
  quote_session_id?: string
  prospect_id?: string
  context_for_summary?: string
  context_for_description?: string
}

export interface BookSlotResult {
  ok: true
  booking_id: string
  start_at: string
  end_at: string
  meet_link: string
}

export interface BookSlotError {
  ok: false
  reason: 'invalid_slot' | 'slot_taken' | 'calendar_disconnected' | 'invalid_email' | 'unknown'
  detail?: string
}

const HOST_EMAIL = 'demandsignals@gmail.com'

export async function listAvailableSlots(opts?: { count?: number; durationMinutes?: number }): Promise<AvailableSlot[]> {
  // Default 20 minutes — intro discovery calls don't need a 30-min block
  // and the shorter ask lowers commitment friction. Hunter's directive
  // 2026-04-29: AI offers "20 minutes Tomorrow at 10:00 AM PT or
  // Thursday at 2:00 PM PT". Slot duration must match the ask.
  return getAvailableSlots({
    duration_minutes: opts?.durationMinutes ?? 20,
    count: opts?.count ?? 2,
  })
}

async function resolveAttendeePhone(opts: {
  prospect_id?: string
  quote_session_id?: string
}): Promise<string | null> {
  if (opts.prospect_id) {
    const { data } = await supabaseAdmin
      .from('prospects')
      .select('owner_phone, business_phone')
      .eq('id', opts.prospect_id)
      .single()
    const phone = data?.owner_phone ?? data?.business_phone
    if (phone) {
      const e164 = toE164(phone)
      if (e164) return e164
    }
  }
  if (opts.quote_session_id) {
    const { data } = await supabaseAdmin
      .from('quote_sessions')
      .select('phone_encrypted, phone_verified')
      .eq('id', opts.quote_session_id)
      .single()
    if (data?.phone_verified && data.phone_encrypted) {
      try {
        const plaintext = decryptPhone(data.phone_encrypted)
        return toE164(plaintext)
      } catch {
        return null
      }
    }
  }
  return null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function bookSlot(opts: BookSlotOpts): Promise<BookSlotResult | BookSlotError> {
  if (!isValidEmail(opts.attendee_email)) {
    return { ok: false, reason: 'invalid_email' }
  }
  const payload = verifySlotId(opts.slot_id)
  if (!payload) return { ok: false, reason: 'invalid_slot' }

  const attendeePhone = await resolveAttendeePhone({
    prospect_id: opts.prospect_id,
    quote_session_id: opts.quote_session_id,
  })

  let event: { event_id: string; meet_link: string; meet_id: string }
  try {
    event = await createMeetingEvent({
      start_at: payload.start_at,
      end_at: payload.end_at,
      attendee_email: opts.attendee_email,
      attendee_name: opts.attendee_name,
      summary: opts.context_for_summary ?? 'Demand Signals — strategy call',
      description: opts.context_for_description ?? `Strategy call with ${opts.attendee_email}.`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'calendar_disconnected') {
      return { ok: false, reason: 'calendar_disconnected' }
    }
    return { ok: false, reason: 'slot_taken', detail: msg }
  }

  const { data: booking, error: insErr } = await supabaseAdmin
    .from('bookings')
    .insert({
      source: opts.source,
      quote_session_id: opts.quote_session_id ?? null,
      prospect_id: opts.prospect_id ?? null,
      host_email: HOST_EMAIL,
      attendee_email: opts.attendee_email,
      attendee_name: opts.attendee_name ?? null,
      attendee_phone: attendeePhone,
      start_at: payload.start_at,
      end_at: payload.end_at,
      google_event_id: event.event_id,
      google_meet_link: event.meet_link,
      google_meet_id: event.meet_id,
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (insErr || !booking) {
    try { await cancelMeetingEvent(event.event_id) } catch { /* best effort */ }
    return { ok: false, reason: 'unknown', detail: insErr?.message ?? 'insert failed' }
  }

  if (opts.quote_session_id) {
    await supabaseAdmin
      .from('quote_sessions')
      .update({ booking_id: booking.id, attendee_email: opts.attendee_email })
      .eq('id', opts.quote_session_id)
  }

  if (opts.prospect_id) {
    const whenLabel = new Date(payload.start_at).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      hour12: true, timeZone: 'America/Los_Angeles',
    }) + ' PT'
    await supabaseAdmin.from('activities').insert({
      prospect_id: opts.prospect_id,
      type: 'meeting_booked',
      channel: opts.source === 'quote' ? 'quote_estimator' : opts.source,
      subject: 'Booked meeting',
      body: [
        whenLabel,
        `Attendee: ${opts.attendee_email}`,
        event.meet_link ? `Meet: ${event.meet_link}` : null,
        `Source: /${opts.source === 'quote' ? 'quote' : opts.source}`,
      ].filter(Boolean).join('\n'),
      created_by: 'booking_system',
    })
  }

  sendBookingConfirmationToProspect(booking.id).catch(() => {})
  sendBookingNotificationToAdmin(booking.id).catch(() => {})

  return {
    ok: true,
    booking_id: booking.id,
    start_at: payload.start_at,
    end_at: payload.end_at,
    meet_link: event.meet_link,
  }
}

export async function cancelBooking(opts: {
  booking_id: string
  reason?: string
  cancelled_by: 'prospect' | 'admin' | 'system'
}): Promise<{ ok: boolean; error?: string }> {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, google_event_id, status')
    .eq('id', opts.booking_id)
    .single()
  if (!booking) return { ok: false, error: 'booking_not_found' }
  if (booking.status === 'cancelled') return { ok: true }

  try {
    await cancelMeetingEvent(booking.google_event_id)
  } catch (e) {
    console.error('[cancelBooking] calendar delete failed:', e instanceof Error ? e.message : e)
  }

  await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: opts.cancelled_by,
      cancel_reason: opts.reason ?? null,
    })
    .eq('id', opts.booking_id)

  sendBookingCancellationToAdmin(opts.booking_id).catch(() => {})
  return { ok: true }
}

export async function rescheduleBooking(opts: {
  booking_id: string
  new_slot_id: string
}): Promise<{ ok: boolean; error?: string; new_start_at?: string }> {
  const payload = verifySlotId(opts.new_slot_id)
  if (!payload) return { ok: false, error: 'invalid_slot' }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, google_event_id, status')
    .eq('id', opts.booking_id)
    .single()
  if (!booking) return { ok: false, error: 'booking_not_found' }
  if (booking.status !== 'confirmed') return { ok: false, error: 'not_confirmed' }

  try {
    await rescheduleMeetingEvent({
      event_id: booking.google_event_id,
      start_at: payload.start_at,
      end_at: payload.end_at,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'reschedule_failed' }
  }

  await supabaseAdmin
    .from('bookings')
    .update({
      start_at: payload.start_at,
      end_at: payload.end_at,
      reminder_24h_sent_at: null,
      reminder_1h_sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', opts.booking_id)

  return { ok: true, new_start_at: payload.start_at }
}
