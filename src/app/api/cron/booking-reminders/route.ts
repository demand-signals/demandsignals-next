// ── GET /api/cron/booking-reminders ──────────────────────────────────
// Vercel cron, runs every 5 minutes. Finds confirmed bookings where:
//   - 24h reminder is due (start_at between now+23h55m and now+24h5m,
//     reminder_24h_sent_at IS NULL)
//   - 1h reminder is due (start_at between now+55m and now+65m,
//     reminder_1h_sent_at IS NULL)
// Each helper sets the *_sent_at on success — exactly-once even if the
// cron fires twice in the window.
//
// Auth: Bearer token matches CRON_SECRET (Vercel Cron supplies header).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendBookingReminder24h, sendBookingReminder1h } from '@/lib/booking-sms'
import { verifyBearerSecret } from '@/lib/bearer-auth'

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!verifyBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in55m = new Date(now.getTime() + 55 * 60_000).toISOString()
  const in65m = new Date(now.getTime() + 65 * 60_000).toISOString()
  const in23h55m = new Date(now.getTime() + (23 * 60 + 55) * 60_000).toISOString()
  const in24h5m = new Date(now.getTime() + (24 * 60 + 5) * 60_000).toISOString()

  const { data: due24h } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .is('reminder_24h_sent_at', null)
    .not('attendee_phone', 'is', null)
    .gte('start_at', in23h55m)
    .lte('start_at', in24h5m)

  const { data: due1h } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .is('reminder_1h_sent_at', null)
    .not('attendee_phone', 'is', null)
    .gte('start_at', in55m)
    .lte('start_at', in65m)

  const results: Array<{ id: string; kind: '24h' | '1h'; ok: boolean; reason?: string }> = []
  for (const row of due24h ?? []) {
    const r = await sendBookingReminder24h(row.id)
    results.push({ id: row.id, kind: '24h', ok: r.ok, reason: r.reason })
  }
  for (const row of due1h ?? []) {
    const r = await sendBookingReminder1h(row.id)
    results.push({ id: row.id, kind: '1h', ok: r.ok, reason: r.reason })
  }

  return NextResponse.json({
    ran_at: now.toISOString(),
    found_24h: due24h?.length ?? 0,
    found_1h: due1h?.length ?? 0,
    results,
  })
}
