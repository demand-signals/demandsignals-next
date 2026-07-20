-- Security hardening 2026-07-20: make the quote AI daily cost cap a near-zero
-- HARD circuit breaker. The /quote endpoints are not linked publicly, so
-- anonymous platform-wide spend should be effectively $0/day.
--
-- Enforcement lives in src/lib/quote-ai-budget.ts preflightOrThrow():
--   - COMMITTED sessions (phone/email verified, etc.) BYPASS this cap.
--   - ANONYMOUS IPs get a small per-IP free allowance
--     (ANON_IP_FREE_ALLOWANCE_CENTS = 5c) to reach verification, then this
--     daily cap applies.
-- Setting the cap to 1 cent (below the 5c free allowance) means the per-IP
-- free allowance is the ONLY path that lets an anonymous turn through — a
-- single abusive IP is bounded to a few cents/day; the platform-wide anon
-- daily spend is effectively zero.
--
-- The prior seeded value was 5000 ($50, an alert-only threshold). This row
-- overrides the code default (0), so it must be updated in the DB for the
-- intent to take effect.
--
-- Web-editor-safe: inlined, no psql meta-commands (\i / \echo).

UPDATE quote_config
SET value = '1'::jsonb,
    description = 'HARD daily cap: total anonymous AI spend per day in cents. Near-zero ($0.01) — /quote is not linked publicly. Committed sessions bypass; anon IPs get a 5c per-IP free allowance. Security 2026-07-20.'
WHERE key = 'daily_cost_cap_cents';

-- If the row somehow doesn't exist, create it near-zero.
INSERT INTO quote_config (key, value, description)
VALUES ('daily_cost_cap_cents', '1'::jsonb, 'HARD daily cap (near-zero). Security 2026-07-20.')
ON CONFLICT (key) DO NOTHING;

-- Verify:
SELECT key, value, description FROM quote_config WHERE key = 'daily_cost_cap_cents';
