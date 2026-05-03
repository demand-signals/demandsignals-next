-- ── 046a_prospects_country.sql ────────────────────────────────────
-- Tier 1 international support: add country to prospect addresses.
--
-- Background: DSIG works with clients in Thailand, Australia, Mexico,
-- Canada, etc. but the prospects table only had {address, city, state,
-- zip} — US-shaped, with state DEFAULT 'CA'. Non-US prospects were
-- being miscategorized as California by default and had no place to
-- record the country at all.
--
-- This migration:
--   1. Adds prospects.country (ISO 3166-1 alpha-2 code, e.g. 'US',
--      'TH', 'AU', 'MX', 'CA'). Default 'US' so existing rows stay
--      sensible without a backfill — every existing prospect today
--      is US-based.
--   2. Drops the state DEFAULT 'CA' constraint. New non-California
--      prospects shouldn't be auto-tagged CA. Existing rows keep
--      their 'CA' value (the column itself isn't touched).
--
-- Currency stays USD-only at the invoice level (per Hunter directive
-- 2026-05-04: international clients pay USD via Stripe). Adding a
-- prospects.currency column is Tier 3, deferred — see
-- docs/superpowers/specs/2026-05-04-international-clients-tiers.md.
--
-- Address line 2 (apt/unit/suite) is also Tier 2 deferred work; one-
-- line `address` is acceptable for now since most international addresses
-- and most US addresses fit on a single line.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US';

ALTER TABLE prospects
  ALTER COLUMN state DROP DEFAULT;

COMMENT ON COLUMN prospects.country IS
  'ISO 3166-1 alpha-2 country code (e.g. US, TH, AU, MX, CA, GB). Defaults to US for existing rows.';
