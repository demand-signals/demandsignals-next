// HMAC-sign and verify slot ids passed through the AI.
//
// The AI receives slot ids from offer_meeting_slots and passes one back
// via book_meeting. Without signing, a prompt-injection attack could
// fabricate an arbitrary timestamp. The signature ties slot_id to its
// start_at + end_at + a server secret — book_meeting verifies before
// touching the calendar.

import crypto from 'node:crypto'

function getSecret(): string {
  const s = process.env.BOOKING_SLOT_SECRET
  if (!s || s.length < 16) {
    throw new Error('BOOKING_SLOT_SECRET not configured (>=16 chars required)')
  }
  return s
}

export interface SlotPayload {
  start_at: string  // ISO with TZ
  end_at: string    // ISO with TZ
}

/**
 * Sign a slot payload. Returns an opaque token of form `<base64url-payload>.<base64url-mac>`.
 * The payload is recoverable from the token (used by verifySlotId to extract start_at/end_at).
 */
export function signSlotId(payload: SlotPayload): string {
  const json = JSON.stringify(payload)
  const payloadB64 = Buffer.from(json).toString('base64url')
  const mac = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${mac}`
}

/**
 * Verify a slot id and return its payload. Returns null on bad signature
 * or malformed input. Constant-time compare to prevent timing attacks.
 */
export function verifySlotId(token: string): SlotPayload | null {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, mac] = parts
  const expected = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!crypto.timingSafeEqual(a, b)) return null
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as SlotPayload
    if (typeof parsed?.start_at !== 'string' || typeof parsed?.end_at !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
