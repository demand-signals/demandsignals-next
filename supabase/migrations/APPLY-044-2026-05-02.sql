-- ── APPLY-044-2026-05-02.sql ───────────────────────────────────────
-- Inlined migration — paste into Supabase web SQL Editor.
--
-- 044a: sow_documents.quote_seed for admin override of back-cover quote.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS quote_seed text;

COMMENT ON COLUMN sow_documents.quote_seed IS
  'Optional override for the back-cover quote selection. NULL = use sow_number (default). Plain string = FNV-1a hash that string to pick a quote. ''quote:N'' sentinel = use BACK_COVER_QUOTES[N] directly.';
