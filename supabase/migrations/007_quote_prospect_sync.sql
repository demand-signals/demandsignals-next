-- Add columns to prospects for progressive enrichment from quote_sessions.
-- scope_summary: human-readable summary of current configurator items
-- source_quote_session_id: the session that originally created this prospect

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS scope_summary text,
  ADD COLUMN IF NOT EXISTS source_quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_estimate_low_cents integer,
  ADD COLUMN IF NOT EXISTS quote_estimate_high_cents integer,
  ADD COLUMN IF NOT EXISTS quote_monthly_low_cents integer,
  ADD COLUMN IF NOT EXISTS quote_monthly_high_cents integer;

CREATE INDEX IF NOT EXISTS idx_prospects_source_quote_session ON prospects (source_quote_session_id) WHERE source_quote_session_id IS NOT NULL;
