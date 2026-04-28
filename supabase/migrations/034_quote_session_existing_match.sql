-- 034: existing-client match hint columns on quote_sessions
--
-- Populated by runResearch() when findExistingProspectFromResearch finds a
-- match. Read by syncProspectFromSession (skip fuzzy chain) and by the
-- system-prompt builder (ask the last-4 confirmation question).
--
-- Both nullable. No backfill — only applies to sessions running after
-- migration deploy. ON DELETE SET NULL so deleting a prospect doesn't
-- orphan-fail a quote.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS matched_prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_phone_last_four text;

CREATE INDEX IF NOT EXISTS idx_quote_sessions_matched_prospect
  ON quote_sessions(matched_prospect_id)
  WHERE matched_prospect_id IS NOT NULL;

COMMENT ON COLUMN quote_sessions.matched_prospect_id IS
  'Existing prospect matched during research. Honored by syncProspectFromSession before fuzzy fallback. Null if no match.';
COMMENT ON COLUMN quote_sessions.matched_phone_last_four IS
  'Last 4 of prospect.owner_phone (preferred) or business_phone, used as the AI confirmation hint. Null if matched prospect has no phone on file.';
