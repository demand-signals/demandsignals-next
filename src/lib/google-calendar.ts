// Thin wrapper around Google Calendar API v3. Pure functions — caller
// persists results. Uses raw fetch (no client lib) to keep cold-start
// small.
//
// All operations target the primary calendar of the connected
// integrations row (resolved by getActiveCalendarIntegration + getValidAccessToken).

import { getActiveCalendarIntegration, getValidAccessToken } from './google-oauth'
import { signSlotId } from './slot-signing'

const API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface AvailableSlot {
  id: string
  start_at: string
  end_at: string
  display_label: string
}

interface FreebusyBusyBlock {
  start: string
  end: string
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const integration = await getActiveCalendarIntegration()
  if (!integration) throw new Error('calendar_disconnected')
  const token = await getValidAccessToken(integration.id)
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${token}`)
  headers.set('content-type', 'application/json')
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}

/**
 * Format a Date for display in PT — used in slot display_label.
 */
function formatPtLabel(d: Date): string {
  const now = new Date()
  const dayMs = 86_400_000
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((startOfThatDay.getTime() - startOfToday.getTime()) / dayMs)
  const dayLabel = diff === 0
    ? 'Today'
    : diff === 1
      ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Los_Angeles' })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles',
  })
  return `${dayLabel} ${time} PT`
}

/**
 * Walk a 14-day window starting `earliest_hours_ahead` from now, in
 * 30-min increments inside the configured business hours, returning the
 * first `count` slots that don't conflict with busy blocks.
 */
export async function getAvailableSlots(opts: {
  duration_minutes?: number
  count?: number
  earliest_hours_ahead?: number
  business_hours?: { start_hour: number; end_hour: number }
  weekdays_only?: boolean
}): Promise<AvailableSlot[]> {
  const duration = opts.duration_minutes ?? 30
  const count = opts.count ?? 2
  const earliestHoursAhead = opts.earliest_hours_ahead ?? 18
  const bh = opts.business_hours ?? { start_hour: 9, end_hour: 17 }
  const weekdaysOnly = opts.weekdays_only ?? true

  const windowStart = new Date(Date.now() + earliestHoursAhead * 3_600_000)
  const windowEnd = new Date(windowStart.getTime() + 14 * 86_400_000)

  const fbRes = await authedFetch('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
      items: [{ id: 'primary' }],
    }),
  })
  if (!fbRes.ok) {
    const text = await fbRes.text()
    throw new Error(`freebusy failed: ${fbRes.status} ${text}`)
  }
  const fbJson = (await fbRes.json()) as {
    calendars: { primary: { busy: FreebusyBusyBlock[] } }
  }
  const busy = fbJson.calendars.primary.busy ?? []

  function overlapsBusy(slotStart: Date, slotEnd: Date): boolean {
    for (const b of busy) {
      const bStart = new Date(b.start)
      const bEnd = new Date(b.end)
      if (slotStart < bEnd && slotEnd > bStart) return true
    }
    return false
  }

  const slots: AvailableSlot[] = []
  const stepMs = Math.min(duration, 30) * 60_000

  for (let cursor = windowStart.getTime(); cursor + duration * 60_000 <= windowEnd.getTime(); cursor += stepMs) {
    if (slots.length >= count) break

    const slotStart = new Date(cursor)
    const slotEnd = new Date(cursor + duration * 60_000)

    const ptHour = Number(slotStart.toLocaleString('en-US', {
      hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles',
    }))
    const ptDay = slotStart.toLocaleString('en-US', {
      weekday: 'short', timeZone: 'America/Los_Angeles',
    })
    if (weekdaysOnly && (ptDay === 'Sat' || ptDay === 'Sun')) continue
    if (ptHour < bh.start_hour || ptHour >= bh.end_hour) continue
    if (overlapsBusy(slotStart, slotEnd)) continue

    const start_at = slotStart.toISOString()
    const end_at = slotEnd.toISOString()
    slots.push({
      id: signSlotId({ start_at, end_at }),
      start_at,
      end_at,
      display_label: formatPtLabel(slotStart),
    })
  }

  return slots
}

/**
 * Create a Calendar event with a Google Meet link. Returns the event id +
 * meet link. Caller persists in bookings table.
 */
export async function createMeetingEvent(opts: {
  start_at: string
  end_at: string
  attendee_email: string
  attendee_name?: string
  summary: string
  description: string
  timezone?: string
}): Promise<{
  event_id: string
  meet_link: string
  meet_id: string
}> {
  const tz = opts.timezone ?? 'America/Los_Angeles'
  const requestId = crypto.randomUUID()

  const body = {
    summary: opts.summary,
    description: opts.description,
    start: { dateTime: opts.start_at, timeZone: tz },
    end: { dateTime: opts.end_at, timeZone: tz },
    attendees: [{ email: opts.attendee_email, displayName: opts.attendee_name }],
    reminders: { useDefault: true },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  const res = await authedFetch(
    '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`createEvent failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as {
    id: string
    conferenceData?: {
      conferenceId?: string
      entryPoints?: Array<{ entryPointType: string; uri: string }>
    }
  }

  const meetEntry = json.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')
  return {
    event_id: json.id,
    meet_link: meetEntry?.uri ?? '',
    meet_id: json.conferenceData?.conferenceId ?? '',
  }
}

export async function cancelMeetingEvent(event_id: string): Promise<void> {
  const res = await authedFetch(
    `/calendars/primary/events/${encodeURIComponent(event_id)}?sendUpdates=all`,
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 410) {
    const text = await res.text()
    throw new Error(`deleteEvent failed: ${res.status} ${text}`)
  }
}

export async function rescheduleMeetingEvent(opts: {
  event_id: string
  start_at: string
  end_at: string
  timezone?: string
}): Promise<void> {
  const tz = opts.timezone ?? 'America/Los_Angeles'
  const res = await authedFetch(
    `/calendars/primary/events/${encodeURIComponent(opts.event_id)}?sendUpdates=all`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        start: { dateTime: opts.start_at, timeZone: tz },
        end: { dateTime: opts.end_at, timeZone: tz },
      }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`patchEvent failed: ${res.status} ${text}`)
  }
}
