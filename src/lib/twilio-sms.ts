// ── Twilio SMS wrapper ──────────────────────────────────────────────
// Send SMS with test-mode allowlist guard until A2P 10DLC approved.
//
// Env vars:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_DSIG_866_NUMBER — sender (E.164)
//   SMS_TEST_MODE          — 'true' to restrict to allowlist
//   SMS_TEST_ALLOWLIST     — comma-separated E.164 numbers (Hunter's cell, etc.)
//
// Kill switch: quote_config.sms_delivery_enabled must be 'true'.

import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase/admin'

let client: ReturnType<typeof twilio> | null = null

function twilioClient() {
  if (client) return client
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured')
  }
  client = twilio(sid, token)
  return client
}

export async function isSmsEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'sms_delivery_enabled')
    .maybeSingle()
  // quote_config.value is JSONB — could be boolean true OR string "true"
  // depending on how it was inserted. Accept both.
  return data?.value === true || data?.value === 'true'
}

function getAllowlist(): string[] {
  const raw = process.env.SMS_TEST_ALLOWLIST ?? ''
  return raw
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
}

function isTestMode(): boolean {
  return process.env.SMS_TEST_MODE === 'true'
}

/** Normalize a phone number to E.164. Defaults US country code. */
function normalizeE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return raw
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

/**
 * Send an SMS. In test mode, refuses to send to numbers outside the allowlist.
 * Returns { success, message_id?, error? }.
 */
export async function sendSms(
  toPhone: string,
  body: string,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!(await isSmsEnabled())) {
    return { success: false, error: 'SMS delivery disabled in config' }
  }

  const from = process.env.TWILIO_DSIG_866_NUMBER
  if (!from) {
    return { success: false, error: 'TWILIO_DSIG_866_NUMBER not configured' }
  }

  const to = normalizeE164(toPhone)

  if (isTestMode()) {
    const allowlist = getAllowlist().map(normalizeE164)
    if (!allowlist.includes(to)) {
      return {
        success: false,
        error: `SMS test mode: ${to} not in allowlist (${allowlist.join(', ') || 'empty'})`,
      }
    }
  }

  try {
    const msg = await twilioClient().messages.create({
      from,
      to,
      body,
    })
    return { success: true, message_id: msg.sid }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
