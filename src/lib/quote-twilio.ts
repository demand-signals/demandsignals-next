// Twilio Verify API wrapper — handles code send + check.
// Uses the Verify service (stateless on our side — Twilio stores the codes).
//
// Required env:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_VERIFY_SERVICE_SID   (create at twilio.com/console/verify/services)
//
// Optional env:
//   TWILIO_FROM_NUMBER          (for outbound non-verify SMS in Stage C)
//
// Lookup API (VOIP detection):
//   Uses the /v2/PhoneNumbers/{phone}?Fields=line_type_intelligence endpoint.

import twilio from 'twilio'
import { toE164 } from './quote-crypto'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

let clientSingleton: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set.')
  }
  if (!clientSingleton) clientSingleton = twilio(accountSid, authToken)
  return clientSingleton
}

export function isTwilioConfigured(): boolean {
  return Boolean(accountSid && authToken && verifyServiceSid)
}

export interface SendCodeResult {
  ok: boolean
  status?: string
  sid?: string
  error?: string
}

export async function sendVerificationCode(phoneInput: string): Promise<SendCodeResult> {
  if (!verifyServiceSid) {
    return { ok: false, error: 'Verify service not configured (TWILIO_VERIFY_SERVICE_SID missing).' }
  }
  const e164 = toE164(phoneInput)
  if (!e164) return { ok: false, error: 'Invalid phone number format.' }

  try {
    const client = getClient()
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: e164, channel: 'sms' })
    return { ok: true, status: verification.status, sid: verification.sid }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'twilio send error'
    return { ok: false, error: msg }
  }
}

export interface CheckCodeResult {
  ok: boolean
  approved: boolean
  status?: string
  error?: string
}

export async function checkVerificationCode(phoneInput: string, code: string): Promise<CheckCodeResult> {
  if (!verifyServiceSid) {
    return { ok: false, approved: false, error: 'Verify service not configured.' }
  }
  const e164 = toE164(phoneInput)
  if (!e164) return { ok: false, approved: false, error: 'Invalid phone format.' }
  if (!/^\d{4,10}$/.test(code)) {
    return { ok: false, approved: false, error: 'Invalid code format.' }
  }

  try {
    const client = getClient()
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: e164, code })
    return { ok: true, approved: check.status === 'approved', status: check.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'twilio check error'
    // Twilio returns 404 when a code is expired / wrong — surface as approved=false.
    if (msg.includes('Resource not') || msg.includes('20404')) {
      return { ok: true, approved: false, status: 'not_found' }
    }
    return { ok: false, approved: false, error: msg }
  }
}

export interface LookupResult {
  ok: boolean
  is_voip?: boolean
  line_type?: string
  carrier?: string
  error?: string
}

export async function lookupPhone(phoneInput: string): Promise<LookupResult> {
  const e164 = toE164(phoneInput)
  if (!e164) return { ok: false, error: 'Invalid phone format.' }
  try {
    const client = getClient()
    const result = await client.lookups.v2.phoneNumbers(e164).fetch({ fields: 'line_type_intelligence' })
    const lineType = result.lineTypeIntelligence?.type
    const carrier = result.lineTypeIntelligence?.carrierName
    const voipTypes = new Set(['nonFixedVoip', 'fixedVoip', 'voip'])
    return {
      ok: true,
      is_voip: lineType ? voipTypes.has(lineType) : false,
      line_type: lineType ?? undefined,
      carrier: carrier ?? undefined,
    }
  } catch (e) {
    // Lookup adds cost per call; if it fails, don't block verification.
    const msg = e instanceof Error ? e.message : 'lookup error'
    return { ok: false, error: msg }
  }
}
