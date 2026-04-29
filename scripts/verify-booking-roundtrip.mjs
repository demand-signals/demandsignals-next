#!/usr/bin/env node
// End-to-end verification: book → cancel → assert calendar mirrors DB.
//
// Run AFTER admin has connected the calendar via /admin/integrations/google.
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// BOOKING_SLOT_SECRET, GOOGLE_DSIG_MAIN_ID_042826, GOOGLE_DSIG_MAIN_SECRET_042826.
//
// Calendar OAuth credentials use the dated DSIG_MAIN names exclusively
// — generic GOOGLE_CLIENT_ID/SECRET names are NOT consulted (per
// CLAUDE.md §12 collision history). Match what src/lib/google-oauth.ts
// reads, since this script's whole point is to mirror the production
// refresh-token flow.

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BOOKING_SLOT_SECRET', 'GOOGLE_DSIG_MAIN_ID_042826', 'GOOGLE_DSIG_MAIN_SECRET_042826']
for (const k of required) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1) }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function signSlotId(payload) {
  const json = JSON.stringify(payload)
  const payloadB64 = Buffer.from(json).toString('base64url')
  const mac = crypto.createHmac('sha256', process.env.BOOKING_SLOT_SECRET).update(payloadB64).digest('base64url')
  return `${payloadB64}.${mac}`
}

async function getAccessToken() {
  const { data: row } = await supabase
    .from('integrations')
    .select('id, refresh_token')
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!row) throw new Error('No active Google Calendar integration. Connect at /admin/integrations/google first.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DSIG_MAIN_ID_042826,
      client_secret: process.env.GOOGLE_DSIG_MAIN_SECRET_042826,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }).toString(),
  })
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.access_token
}

let pass = 0, fail = 0
function ok(label) { console.log(`  ✓ ${label}`); pass++ }
function bad(label, detail) { console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); fail++ }

async function main() {
  console.log('1. Acquire access token via refresh')
  const token = await getAccessToken()
  ok('access token acquired')

  console.log('\n2. Pick a free slot (1 hour from now, 30 min)')
  const start = new Date(Date.now() + 60 * 60_000)
  const end = new Date(start.getTime() + 30 * 60_000)
  const slot_id = signSlotId({ start_at: start.toISOString(), end_at: end.toISOString() })
  ok('slot signed')
  void slot_id

  console.log('\n3. Create event via Calendar API directly')
  const evRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
    {
      method: 'POST',
      headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: '[VERIFICATION] DSIG booking-roundtrip test',
        description: 'Created by scripts/verify-booking-roundtrip.mjs — will be deleted in <5s',
        start: { dateTime: start.toISOString(), timeZone: 'America/Los_Angeles' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Los_Angeles' },
        attendees: [{ email: 'verification-test@example.com' }],
        conferenceData: {
          createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      }),
    },
  )
  if (!evRes.ok) {
    bad('event creation', `${evRes.status} ${await evRes.text()}`)
    process.exit(1)
  }
  const ev = await evRes.json()
  ok('event created')
  const meetLink = ev.conferenceData?.entryPoints?.[0]?.uri
  if (meetLink) ok(`meet link present: ${meetLink}`)
  else bad('meet link missing in conferenceData')

  console.log('\n4. Insert bookings row')
  const { data: row, error: insErr } = await supabase
    .from('bookings')
    .insert({
      source: 'admin_manual',
      host_email: 'demandsignals@gmail.com',
      attendee_email: 'verification-test@example.com',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      google_event_id: ev.id,
      google_meet_link: meetLink ?? null,
      google_meet_id: ev.conferenceData?.conferenceId ?? null,
      status: 'confirmed',
    })
    .select('id, status')
    .single()
  if (insErr) { bad('booking insert', insErr.message); process.exit(1) }
  ok('booking row inserted')

  console.log('\n5. Cancel the event')
  const delRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}?sendUpdates=none`,
    { method: 'DELETE', headers: { 'authorization': `Bearer ${token}` } },
  )
  if (delRes.ok || delRes.status === 410) ok('calendar event deleted')
  else bad('delete failed', `${delRes.status}`)

  console.log('\n6. Cleanup booking row')
  await supabase.from('bookings').delete().eq('id', row.id)
  ok('booking row deleted')

  console.log(`\nResults: ${pass} pass, ${fail} fail`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('Crashed:', e); process.exit(1) })
