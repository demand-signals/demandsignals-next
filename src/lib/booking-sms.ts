// SMS dispatchers for the booking lifecycle. Honors:
//   - sms_delivery_enabled (existing kill switch via isSmsEnabled)
//   - booking_reminders_enabled (new flag for reminders only)
// All sends use the existing sendSms helper (Twilio + idempotent + logged).

import { supabaseAdmin } from './supabase/admin'
import { sendSms, isSmsEnabled } from './twilio-sms'
import { notifyAdminsBySms } from './admin-sms'

interface BookingForSms {
  id: string
  attendee_phone: string | null
  attendee_email: string
  attendee_name: string | null
  start_at: string
  google_meet_link: string | null
  google_meet_id: string | null
  status: string
  cancelled_by: string | null
  prospect_id: string | null
}

interface ProspectForSms {
  business_name: string | null
}

async function loadBooking(booking_id: string): Promise<{
  booking: BookingForSms
  prospect: ProspectForSms | null
} | null> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id, attendee_phone, attendee_email, attendee_name, start_at, google_meet_link, google_meet_id, status, cancelled_by, prospect_id')
    .eq('id', booking_id)
    .single()
  if (!data) return null
  let prospect: ProspectForSms | null = null
  if (data.prospect_id) {
    const { data: p } = await supabaseAdmin
      .from('prospects').select('business_name').eq('id', data.prospect_id).single()
    prospect = p as ProspectForSms | null
  }
  return { booking: data as BookingForSms, prospect }
}

function formatPt(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Los_Angeles',
  })
  return `${day} ${time} PT`
}

async function isReminderEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config').select('value').eq('key', 'booking_reminders_enabled').maybeSingle()
  // JSONB readers tolerate native boolean OR string (CLAUDE.md §12 lesson)
  return data?.value === true || data?.value === 'true'
}

export async function sendBookingConfirmationToProspect(booking_id: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false, reason: 'booking_not_found' }
  if (!ctx.booking.attendee_phone) return { ok: false, reason: 'no_phone' }

  const when = formatPt(ctx.booking.start_at)
  const link = ctx.booking.google_meet_link ?? ''
  const body = `Demand Signals: you're booked for ${when}. Meet: ${link} — reply if you need to reschedule.`
  const result = await sendSms(ctx.booking.attendee_phone, body)
  return result.success ? { ok: true } : { ok: false, reason: result.error ?? 'send_failed' }
}

export async function sendBookingNotificationToAdmin(booking_id: string): Promise<{ ok: boolean }> {
  if (!(await isSmsEnabled())) return { ok: false }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false }
  const biz = ctx.prospect?.business_name ?? ctx.booking.attendee_email
  const when = formatPt(ctx.booking.start_at)
  const link = ctx.booking.google_meet_link ?? '(no meet link)'
  await notifyAdminsBySms({ source: 'booking_created', body: `🎯 Booked: ${biz} — ${when} — ${link}` })
  return { ok: true }
}

export async function sendBookingCancellationToAdmin(booking_id: string): Promise<{ ok: boolean }> {
  if (!(await isSmsEnabled())) return { ok: false }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false }
  const biz = ctx.prospect?.business_name ?? ctx.booking.attendee_email
  const when = formatPt(ctx.booking.start_at)
  const by = ctx.booking.cancelled_by ?? 'unknown'
  await notifyAdminsBySms({ source: 'booking_cancelled', body: `❌ Cancelled: ${biz} — was ${when} — by ${by}` })
  return { ok: true }
}

export async function sendBookingReminder24h(booking_id: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  if (!(await isReminderEnabled())) return { ok: false, reason: 'reminders_disabled' }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false, reason: 'booking_not_found' }
  if (ctx.booking.status !== 'confirmed') return { ok: false, reason: 'not_confirmed' }
  if (!ctx.booking.attendee_phone) return { ok: false, reason: 'no_phone' }

  const when = formatPt(ctx.booking.start_at)
  const link = ctx.booking.google_meet_link ?? ''
  const body = `Demand Signals reminder: strategy call tomorrow at ${when}. Meet: ${link}`
  const result = await sendSms(ctx.booking.attendee_phone, body)
  if (result.success) {
    await supabaseAdmin
      .from('bookings')
      .update({ reminder_24h_sent_at: new Date().toISOString() })
      .eq('id', booking_id)
    return { ok: true }
  }
  return { ok: false, reason: result.error ?? 'send_failed' }
}

export async function sendBookingReminder1h(booking_id: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isSmsEnabled())) return { ok: false, reason: 'sms_disabled' }
  if (!(await isReminderEnabled())) return { ok: false, reason: 'reminders_disabled' }
  const ctx = await loadBooking(booking_id)
  if (!ctx) return { ok: false, reason: 'booking_not_found' }
  if (ctx.booking.status !== 'confirmed') return { ok: false, reason: 'not_confirmed' }
  if (!ctx.booking.attendee_phone) return { ok: false, reason: 'no_phone' }

  const link = ctx.booking.google_meet_link ?? ''
  const body = `Demand Signals: your call starts in 1 hour. Meet: ${link}`
  const result = await sendSms(ctx.booking.attendee_phone, body)
  if (result.success) {
    await supabaseAdmin
      .from('bookings')
      .update({ reminder_1h_sent_at: new Date().toISOString() })
      .eq('id', booking_id)
    return { ok: true }
  }
  return { ok: false, reason: result.error ?? 'send_failed' }
}
