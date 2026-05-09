// ── Stripe SDK wrapper ──────────────────────────────────────────────
// Singleton Stripe client + idempotency helpers.
//
// Required env vars:
//   Secret key (sk_live_/sk_test_/rk_live_/rk_test_) — REQUIRED. Resolved
//     in this priority order from explicit named slots only:
//       1. DSIG_STRIPE_RESTRICTED_KEY_050826
//       2. DSIG_STRIPE_STANDARD_KEY_050826
//       3. DSIG_STRIPE_KEY_042626 (prior dated key, kept as fallback)
//     No glob/auto-discovery. Add a new named slot to resolveStripeSecret
//     when rotating; bump the date suffix at the same time.
//   STRIPE_SNAPSHOT_SIGNING_SECRET — for verifying webhook signatures.
//     Falls back to STRIPE_WEBHOOK_SECRET. Until set, webhook returns 503.
//   DSIG_STRIPE_PUBLISHABLE_KEY_050826 — for any future client-side flows.
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

// Stripe-issued secret-key prefixes. Stripe uses two:
//   sk_live_ / sk_test_  — Standard secret key (broad scope)
//   rk_live_ / rk_test_  — Restricted key (granular permissions)
// Pasted credentials from other vendors (e.g. ak_, pat_, mk_, AKIA…,
// ghp_) are rejected up front so the fallback chain has a chance to
// find a real key instead of the SDK silently caching a garbage value
// and erroring on first API call.
//
// History note: an earlier version of this regex accepted a bogus 'mk_'
// prefix on a misread of Stripe's docs — that opened the door for
// non-Stripe env vars (whose values happen to start with mk_) to be
// matched by the DSIG_STRIPE_KEY_* glob discovery and handed to the
// Stripe SDK. The glob is also gone now (only explicit named slots).
const VALID_SECRET_KEY_PATTERN = /^(sk_(live|test)_|rk_(live|test)_)/

function isValidStripeSecretKey(v: string | undefined | null): boolean {
  return typeof v === 'string' && VALID_SECRET_KEY_PATTERN.test(v.trim())
}

function getSecretKey(): string {
  return resolveStripeSecret().key
}

/**
 * Walk the candidate env-var chain, return the first that matches a Stripe
 * secret-key prefix (sk_live_/sk_test_/rk_live_/rk_test_). Slots are
 * searched in priority order; the first valid one wins.
 *
 * Slot priority (newer dated keys win, restricted preferred over standard):
 *   1. DSIG_STRIPE_RESTRICTED_KEY_050826  — new restricted key (current)
 *   2. DSIG_STRIPE_STANDARD_KEY_050826    — new standard key (current)
 *   3. DSIG_STRIPE_KEY_042626             — prior dated key, fallback
 *
 * Glob discovery (DSIG_STRIPE_KEY_*) is intentionally NOT used. An earlier
 * version of this resolver scanned every env var with that prefix and
 * picked the first one that passed the regex. Combined with a too-loose
 * regex (allowed `mk_`), that let a non-Stripe credential whose value
 * happened to start with `mk_` get fed to the Stripe SDK, producing
 * Invalid API Key errors at runtime. Explicit named slots only from now
 * on. Add a new slot here when rotating; don't reach for a glob.
 *
 * Garbage slots (set but not a Stripe prefix) are skipped with a console
 * warning that names the slot — surfaces in Vercel logs and on the admin
 * Settings page via getStripeKeyDiagnostics.
 */
function resolveStripeSecret(): {
  key: string
  active_slot: string | null
  rejected: Array<{ slot: string; prefix: string }>
} {
  const candidates: Array<[string, string | undefined]> = [
    ['DSIG_STRIPE_RESTRICTED_KEY_050826', process.env.DSIG_STRIPE_RESTRICTED_KEY_050826],
    ['DSIG_STRIPE_STANDARD_KEY_050826', process.env.DSIG_STRIPE_STANDARD_KEY_050826],
    ['DSIG_STRIPE_KEY_042626', process.env.DSIG_STRIPE_KEY_042626],
  ]

  const rejected: Array<{ slot: string; prefix: string }> = []
  for (const [name, value] of candidates) {
    if (!value) continue
    if (isValidStripeSecretKey(value)) {
      return { key: value.trim(), active_slot: name, rejected }
    }
    rejected.push({ slot: name, prefix: value.slice(0, 4) })
    // Loud signal in serverless logs — helps diagnose 'Invalid API Key'
    // errors at the call site rather than the SDK boundary.
    console.warn(
      `[stripe-client] ${name} is set but does not look like a Stripe secret key ` +
      `(expected sk_live_/sk_test_/rk_live_/rk_test_ prefix; got ${value.slice(0, 4)}…). Skipping.`,
    )
  }
  return { key: '', active_slot: null, rejected }
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
      'No valid Stripe secret key found. Checked DSIG_STRIPE_RESTRICTED_KEY_050826, ' +
      'DSIG_STRIPE_STANDARD_KEY_050826, DSIG_STRIPE_KEY_042626 — none had an sk_live_/sk_test_/rk_live_/rk_test_ prefix. ' +
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
  const secret = resolveStripeSecret()

  const whCandidates: Array<[string, string | undefined]> = [
    ['STRIPE_SNAPSHOT_SIGNING_SECRET', process.env.STRIPE_SNAPSHOT_SIGNING_SECRET],
    ['STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET],
  ]
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
    active_secret_slot: secret.active_slot,
    // First few chars: covers mk_, sk_live, rk_live, etc without leaking the tail.
    active_secret_prefix: secret.key ? secret.key.slice(0, 7) : null,
    rejected_secret_slots: secret.rejected,
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
