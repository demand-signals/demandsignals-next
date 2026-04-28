// ── Stripe SDK wrapper ──────────────────────────────────────────────
// Singleton Stripe client + idempotency helpers.
//
// Required env vars:
//   STRIPE_SECRET_KEY — secret key (sk_test_... or sk_live_...). REQUIRED.
//     Falls back to STRIPE_CLAUDE_API_KEY or legacy STRIPE_API_KEY.
//   STRIPE_SNAPSHOT_SIGNING_SECRET — for verifying webhook signatures.
//     Falls back to STRIPE_WEBHOOK_SECRET. Until set, webhook returns 503.
//   STRIPE_PUBLISHABLE_KEY — for any future client-side flows.
//     Not currently used (we host invoices, Stripe hosts checkout/portal).
//
// Webhook payload style: our handler expects SNAPSHOT payloads (the
// full data.object with all fields). Thin payloads are a newer Stripe
// format requiring an API fetch per event — not used yet. The Thin
// destination's signing secret is stored as STRIPE_THIN_SIGNING_SECRET
// for future use.
//
// Kill switch: quote_config.stripe_enabled must be 'true' for any Stripe
// call to succeed. Enforce in callers via isStripeEnabled().

import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

let client: Stripe | null = null

// Stripe-issued secret-key prefixes. Anything else is rejected up front
// (e.g. mk_, ak_, pasted Mailchimp/Anthropic credentials, truncated values)
// so the fallback chain has a chance to find a real key instead of the
// SDK silently caching a garbage value and erroring on first API call.
const VALID_SECRET_KEY_PATTERN = /^(sk|rk)_(live|test)_/

function isValidStripeSecretKey(v: string | undefined | null): boolean {
  return typeof v === 'string' && VALID_SECRET_KEY_PATTERN.test(v.trim())
}

function getSecretKey(): string {
  // Try each candidate in priority order. Any value that doesn't match a
  // Stripe secret-key prefix is skipped so a misconfigured slot doesn't
  // shadow a working one further down the chain.
  const candidates: Array<[string, string | undefined]> = [
    ['STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY],
    ['STRIPE_CLAUDE_API_KEY', process.env.STRIPE_CLAUDE_API_KEY],
    ['STRIPE_API_KEY', process.env.STRIPE_API_KEY],
  ]
  for (const [name, value] of candidates) {
    if (!value) continue
    if (isValidStripeSecretKey(value)) return value.trim()
    // Loud signal in serverless logs — helps diagnose 'Invalid API Key'
    // errors at the call site rather than the SDK boundary.
    console.warn(
      `[stripe-client] ${name} is set but does not look like a Stripe secret key ` +
      `(expected sk_live_/sk_test_/rk_live_/rk_test_ prefix; got ${value.slice(0, 4)}…). Skipping.`,
    )
  }
  return ''
}

function isValidWebhookSecret(v: string | undefined | null): boolean {
  return typeof v === 'string' && /^whsec_/.test(v.trim())
}

function getSnapshotSigningSecret(): string {
  const candidates: Array<[string, string | undefined]> = [
    ['STRIPE_SNAPSHOT_SIGNING_SECRET', process.env.STRIPE_SNAPSHOT_SIGNING_SECRET],
    ['STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET],
  ]
  for (const [name, value] of candidates) {
    if (!value) continue
    if (isValidWebhookSecret(value)) return value.trim()
    console.warn(
      `[stripe-client] ${name} is set but does not look like a Stripe webhook ` +
      `signing secret (expected whsec_ prefix; got ${value.slice(0, 6)}…). Skipping.`,
    )
  }
  return ''
}

// We cache by key value, not by null/non-null. If the env var changes
// between requests on a long-lived Lambda (e.g. after a Vercel env-var
// update without a code redeploy), the cached client gets rebuilt with
// the new key on next call instead of serving stale.
let cachedKey: string | null = null

/** Get the singleton Stripe client. Throws if no valid secret key is configured. */
export function stripe(): Stripe {
  const key = getSecretKey()
  if (!key) {
    throw new Error(
      'No valid Stripe secret key found. Checked STRIPE_SECRET_KEY, ' +
      'STRIPE_CLAUDE_API_KEY, STRIPE_API_KEY — none had an sk_/rk_ prefix. ' +
      'See server logs for which slots were set but rejected.',
    )
  }
  if (client && cachedKey === key) return client
  cachedKey = key
  client = new Stripe(key, {
    // Let the SDK use its own pinned default; avoids API-version drift bugs.
    // We pin the SDK version in package.json instead.
    appInfo: {
      name: 'demandsignals-next',
      version: '1.0.0',
      url: 'https://demandsignals.co',
    },
  })
  return client
}

/** Checks the kill switch. Returns false if Stripe is disabled at the config layer. */
export async function isStripeEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quote_config')
    .select('value')
    .eq('key', 'stripe_enabled')
    .maybeSingle()
  // quote_config.value is JSONB — could be boolean true OR string "true"
  // depending on how it was inserted. Accept both.
  return data?.value === true || data?.value === 'true'
}

/** Checks if the Stripe webhook signing secret is configured. */
export function isWebhookConfigured(): boolean {
  return Boolean(getSnapshotSigningSecret())
}

/** Returns the snapshot-payload signing secret for webhook signature verification. */
export function getWebhookSigningSecret(): string {
  return getSnapshotSigningSecret()
}

/**
 * Diagnostic snapshot of which Stripe credential slots are wired up and
 * usable. Returns slot name + key prefix (no secret material). Safe to
 * surface on admin pages so operators can see at a glance which env var
 * the running server is actually reading from.
 */
export function getStripeKeyDiagnostics(): {
  active_secret_slot: string | null
  active_secret_prefix: string | null
  rejected_secret_slots: Array<{ slot: string; prefix: string }>
  active_webhook_slot: string | null
  rejected_webhook_slots: Array<{ slot: string; prefix: string }>
} {
  const secretCandidates: Array<[string, string | undefined]> = [
    ['STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY],
    ['STRIPE_CLAUDE_API_KEY', process.env.STRIPE_CLAUDE_API_KEY],
    ['STRIPE_API_KEY', process.env.STRIPE_API_KEY],
  ]
  const whCandidates: Array<[string, string | undefined]> = [
    ['STRIPE_SNAPSHOT_SIGNING_SECRET', process.env.STRIPE_SNAPSHOT_SIGNING_SECRET],
    ['STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET],
  ]

  let active_secret_slot: string | null = null
  let active_secret_prefix: string | null = null
  const rejected_secret_slots: Array<{ slot: string; prefix: string }> = []
  for (const [name, value] of secretCandidates) {
    if (!value) continue
    const trimmed = value.trim()
    if (isValidStripeSecretKey(trimmed)) {
      if (!active_secret_slot) {
        active_secret_slot = name
        // First 7 chars covers sk_live / rk_live etc without leaking the unique tail.
        active_secret_prefix = trimmed.slice(0, 7)
      }
    } else {
      rejected_secret_slots.push({ slot: name, prefix: trimmed.slice(0, 4) })
    }
  }

  let active_webhook_slot: string | null = null
  const rejected_webhook_slots: Array<{ slot: string; prefix: string }> = []
  for (const [name, value] of whCandidates) {
    if (!value) continue
    const trimmed = value.trim()
    if (isValidWebhookSecret(trimmed)) {
      if (!active_webhook_slot) active_webhook_slot = name
    } else {
      rejected_webhook_slots.push({ slot: name, prefix: trimmed.slice(0, 6) })
    }
  }

  return {
    active_secret_slot,
    active_secret_prefix,
    rejected_secret_slots,
    active_webhook_slot,
    rejected_webhook_slots,
  }
}

/**
 * Record a Stripe event in stripe_events with idempotency check.
 * Returns { alreadyProcessed: true } if event was seen before.
 * Caller should skip processing in that case.
 */
export async function recordStripeEvent(
  event: Stripe.Event,
  processingResult?: string,
  errorMessage?: string,
): Promise<{ alreadyProcessed: boolean }> {
  // Try insert; UNIQUE constraint on stripe_event_id enforces idempotency.
  const { error } = await supabaseAdmin.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processing_result: processingResult ?? null,
    error_message: errorMessage ?? null,
  })

  if (error) {
    // 23505 = unique_violation (duplicate event)
    if (error.code === '23505') {
      return { alreadyProcessed: true }
    }
    throw new Error(`Failed to record stripe_event: ${error.message}`)
  }

  return { alreadyProcessed: false }
}

/** Generate an idempotency key for Stripe requests that should be safely retried. */
export function idempotencyKey(scope: string, id: string): string {
  return `dsig_${scope}_${id}_v1`
}
