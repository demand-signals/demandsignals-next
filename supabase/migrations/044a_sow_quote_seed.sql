-- ── 044a_sow_quote_seed.sql ────────────────────────────────────────
-- Adds sow_documents.quote_seed for the back-cover rotating quote.
--
-- Default behavior (NULL) is unchanged: pickBackCoverQuote uses
-- sow_number as the seed, so every existing SOW renders the exact
-- same quote it always has. No re-render surprises.
--
-- When admin clicks "Reroll" or "Pick" on the SOW editor, this column
-- is populated:
--   - Reroll → fresh UUID (e.g. 'a3f1...')
--     pickBackCoverQuote hashes it via FNV-1a and lands on a different
--     quote than sow_number would. Each reroll lands on a (probably)
--     different quote — same hash function, just a new seed.
--   - Pick   → 'quote:N' sentinel where N is the literal index into
--     BACK_COVER_QUOTES. The picker code short-circuits the hash and
--     uses that index directly. Bit hacky but cheap.
--
-- Either way, regenerating the PDF for the same SOW keeps producing the
-- same chosen quote, because the seed is now persisted on the row
-- instead of derived from sow_number.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS quote_seed text;

COMMENT ON COLUMN sow_documents.quote_seed IS
  'Optional override for the back-cover quote selection. NULL = use sow_number (default). Plain string = FNV-1a hash that string to pick a quote. ''quote:N'' sentinel = use BACK_COVER_QUOTES[N] directly.';
