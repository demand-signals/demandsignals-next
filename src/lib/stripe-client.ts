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

function getSecretKey(): string {
  return (
    process.env.STRIPE_SECRET_KEY ??
    process.env.STRIPE_CLAUDE_API_KEY ??
    process.env.STRIPE_API_KEY ??
    ''
  )
}

function getSnapshotSigningSecret(): string {
  return (
    process.env.STRIPE_SNAPSHOT_SIGNING_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    ''
  )
}

/** Get the singleton Stripe client. Throws if no secret key is configured. */
export function stripe(): Stripe {
  if (client) return client
  const key = getSecretKey()
  if (!key) {
    throw new Error(
      'Stripe secret key not configured (set STRIPE_SECRET_KEY or STRIPE_CLAUDE_API_KEY)',
    )
  }
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
  return data?.value === 'true'
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
