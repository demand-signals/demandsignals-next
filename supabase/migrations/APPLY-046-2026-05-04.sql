-- ── APPLY-046-2026-05-04.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 046a: prospects.country column + drop state DEFAULT 'CA'.
--       Tier 1 international support per Hunter directive 2026-05-04.
--       Currency stays USD-only (Tier 3 deferred).

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US';

ALTER TABLE prospects
  ALTER COLUMN state DROP DEFAULT;

COMMENT ON COLUMN prospects.country IS
  'ISO 3166-1 alpha-2 country code (e.g. US, TH, AU, MX, CA, GB). Defaults to US for existing rows.';

-- Verify
SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'prospects'
    AND column_name IN ('country', 'state')
  ORDER BY column_name;
-- Expect: country (text, 'US'::text default, NOT NULL) and state (text, NULL default).
