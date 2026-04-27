// ── /api/admin/config — read/write quote_config kill switches ──────
//
// Lightweight admin API over the quote_config table. Used by the
// settings page to see current flag state + flip flags without opening
// the Supabase SQL Editor.
//
// GET  → returns all config keys/values + env-var readiness signals
// PATCH → body { key, value } — updates or inserts a single key

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Keys we surface on the settings UI + expected value type.
const KNOWN_FLAGS = [
  'automated_invoicing_enabled',
  'stripe_enabled',
  'sms_delivery_enabled',
  'email_delivery_enabled',
  'subscription_cycle_cron_enabled',
  'a2p_transactional_enabled',
  'ai_enabled',
  'cadence_enabled',
] as const

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('quote_config')
    .select('key, value')
    .order('key', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return env-var readiness signals (not the values — just "is this set?").
  // Helps admins diagnose "SMS flag is on but nothing is sending — oh, TWILIO_AUTH_TOKEN isn't set."
  const env = {
    stripe_secret_configured: Boolean(
      process.env.STRIPE_SECRET_KEY ??
        process.env.STRIPE_CLAUDE_API_KEY ??
        process.env.STRIPE_API_KEY,
    ),
    stripe_webhook_secret_configured: Boolean(
      process.env.STRIPE_SNAPSHOT_SIGNING_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET,
    ),
    stripe_publishable_configured: Boolean(process.env.STRIPE_PUBLISHABLE_KEY),
    twilio_configured: Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    ),
    twilio_866_configured: Boolean(process.env.TWILIO_DSIG_866_NUMBER),
    sms_test_mode: process.env.SMS_TEST_MODE === 'true',
    sms_test_allowlist_count: (process.env.SMS_TEST_ALLOWLIST ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0).length,
    smtp_configured: Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
    ),
    pdf_service_configured: Boolean(
      process.env.PDF_SERVICE_URL && process.env.PDF_SERVICE_SECRET,
    ),
    r2_configured: Boolean(
      process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
    ),
    cron_secret_configured: Boolean(process.env.CRON_SECRET),
  }

  return NextResponse.json({
    config: data ?? [],
    known_flags: KNOWN_FLAGS,
    env,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'Body must include key: string' }, { status: 400 })
  }
  const key = body.key
  // quote_config.value is JSONB. Preserve native types when caller supplies
  // them (boolean toggles, numeric thresholds). String 'true'/'false' coerce
  // to JSONB boolean for canonical storage. All other strings stored as-is.
  let value: unknown = body.value
  if (typeof value === 'string') {
    if (value === 'true') value = true
    else if (value === 'false') value = false
  } else if (value === null || value === undefined) {
    value = ''
  }

  // UPSERT — inserts if absent, updates if present.
  const { error } = await supabaseAdmin
    .from('quote_config')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, key, value })
}
