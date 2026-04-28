import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createMeetingEvent, cancelMeetingEvent } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const start = new Date(Date.now() + 5 * 60_000)
  const end = new Date(start.getTime() + 60_000)

  try {
    const event = await createMeetingEvent({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      attendee_email: 'demandsignals@gmail.com',
      summary: '[TEST] DSIG calendar integration test',
      description: 'Created by /api/integrations/google/test. Will be deleted in <1s.',
    })
    await cancelMeetingEvent(event.event_id)
    return NextResponse.json({ ok: true, meet_link: event.meet_link, event_id: event.event_id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
