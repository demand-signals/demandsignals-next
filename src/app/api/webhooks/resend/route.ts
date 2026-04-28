// ── POST /api/webhooks/resend ───────────────────────────────────────
// Handles Resend webhook events (delivered/opened/clicked/bounced/etc).
// Verifies Svix-style HMAC signature using RESEND_WEBHOOK_SECRET.
// Inserts an email_engagement row per event (idempotent via UNIQUE constraint).
// See spec §4.4.

import { NextRequest, NextResponse } from 'next/server'
import { recordWebhookEvent } from '@/lib/email-engagement'
import { notify } from '@/lib/system-alerts'

interface ResendEventEnvelope {
  type: string                // 'email.delivered' | 'email.opened' | etc.
  data: {
    email_id?: string         // Resend message id
    created_at?: string
    [key: string]: unknown
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  // Svix headers
  const msgId = request.headers.get('svix-id')
  const msgTimestamp = request.headers.get('svix-timestamp')
  const msgSignature = request.headers.get('svix-signature')
  if (!msgId || !msgTimestamp || !msgSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  // Replay window: reject events older than 5 minutes. Svix recommends
  // a tolerance window to bound replay-attack effectiveness even if the
  // signing secret were ever leaked.
  const tsSeconds = Number(msgTimestamp)
  if (!Number.isFinite(tsSeconds)) {
    return NextResponse.json({ error: 'Invalid svix-timestamp' }, { status: 400 })
  }
  const ageSeconds = Math.abs(Date.now() / 1000 - tsSeconds)
  if (ageSeconds > 300) {
    return NextResponse.json(
      { error: 'svix-timestamp outside acceptable freshness window (5min)' },
      { status: 400 },
    )
  }

  const rawBody = await request.text()

  // Verify signature using Web Crypto (no extra dep needed).
  const expected = await computeSvixSignature(secret, msgId, msgTimestamp, rawBody)
  // svix-signature can contain multiple space-separated "v1,<sig>" pairs;
  // any match counts as valid (allows secret rotation). Use a constant-time
  // compare so timing differences across attempts don't leak which byte
  // matched.
  const presented = msgSignature.split(' ').map((s) => s.trim()).filter(Boolean)
  const ok = presented.some((p) => {
    const [, sig] = p.split(',')
    if (!sig || sig.length !== expected.length) return false
    // crypto-safe compare — Buffer parity already enforced above.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { timingSafeEqual } = require('node:crypto') as typeof import('node:crypto')
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return false
    }
  })
  if (!ok) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Parse event
  let event: ResendEventEnvelope
  try {
    event = JSON.parse(rawBody) as ResendEventEnvelope
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messageId = event.data.email_id
  if (!messageId) {
    return NextResponse.json({ ok: true, ignored: 'no email_id' })
  }

  // Map Resend event types to our event_type enum.
  const eventTypeMap: Record<string, string> = {
    'email.sent': 'sent',                       // already recorded by sendEmail; would be a duplicate
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.delivery_delayed': 'delivery_delayed',
    'email.failed': 'failed',
  }
  const ourType = eventTypeMap[event.type]
  if (!ourType) {
    // Unknown event; acknowledge so Resend doesn't retry, but don't write.
    return NextResponse.json({ ok: true, ignored: `unknown event ${event.type}` })
  }
  // Skip 'sent' from webhook — we already recorded it inline at send time.
  if (ourType === 'sent') {
    return NextResponse.json({ ok: true, ignored: 'sent recorded inline' })
  }

  try {
    await recordWebhookEvent({
      resend_message_id: messageId,
      event_type: ourType as
        | 'delivered'
        | 'opened'
        | 'clicked'
        | 'bounced'
        | 'complained'
        | 'delivery_delayed'
        | 'failed',
      occurred_at: event.data.created_at ?? new Date().toISOString(),
      event_data: event.data as Record<string, unknown>,
    })

    // Bounce / complaint events deserve their own system_notifications row
    // so they show up in the future Command Center alongside hard failures.
    if (ourType === 'bounced' || ourType === 'complained') {
      await notify({
        severity: ourType === 'complained' ? 'warning' : 'info',
        source: 'email_event',
        title: `Resend ${ourType} for ${event.data.email_id}`,
        body: JSON.stringify(event.data, null, 2),
        context: { resend_message_id: messageId, event_type: ourType, error_code: ourType },
      })
    }
  } catch (e) {
    console.error('[resend webhook] processing failed:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ ok: true })
}

// HMAC-SHA256(secret, msgId + "." + msgTimestamp + "." + body), base64.
async function computeSvixSignature(
  secret: string,
  msgId: string,
  msgTimestamp: string,
  body: string,
): Promise<string> {
  // Svix secrets are prefixed "whsec_" and the actual key is base64.
  const keyMaterial = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const keyBytes = base64ToBytes(keyMaterial)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const messageBytes = new TextEncoder().encode(`${msgId}.${msgTimestamp}.${body}`)
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength) as ArrayBuffer,
  )
  return bytesToBase64(new Uint8Array(sig))
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}
