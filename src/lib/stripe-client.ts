// ── Stripe SDK wrapper ──────────────────────────────────────────────
// Singleton Stripe client + idempotency helpers.
//
// Required env vars:
//   STRIPE_API_KEY — secret key (sk_test_... or sk_live_...). REQUIRED.
//   STRIPE_WEBHOOK_SECRET — for verifying webhook signatures.
//     Until set, webhook endpoint returns 503.
//   STRIPE_PUBLISHABLE_KEY — for any future client-side flows.
//     Not currently used (we host invoices, Stripe hosts checkout/portal).
//
// Kill switch: quote_config.stripe_enabled must be 'true' for any Stripe
// call to succeed. Enforce in callers via isStripeEnabled().

import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

let client: Stripe | null = null

/** Get the singleton Stripe client. Throws if STRIPE_API_KEY is missing. */
export function stripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_API_KEY
  if (!key) throw new Error('STRIPE_API_KEY not configured')
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

/** Checks if the Stripe webhook secret is configured (needed to verify signatures). */
export function isWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET)
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
