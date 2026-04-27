-- ── 029b: prospects.first_inquiry_at + last_inquiry_at ────────────
-- Cheap denorm so cleanup queries (stale unqualified prospects) and
-- admin filters (last activity) are trivial. Bumped by RPC 029c.

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS first_inquiry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inquiry_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospects_last_inquiry_at
  ON prospects (last_inquiry_at DESC) WHERE last_inquiry_at IS NOT NULL;
