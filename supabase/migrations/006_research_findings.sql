-- Add research_findings jsonb column to quote_sessions.
-- Populated asynchronously by the research subagent after business_name +
-- business_location are captured. AI reads this and weaves findings into the
-- conversation via the confirmation-hook pattern.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS research_findings jsonb,
  ADD COLUMN IF NOT EXISTS research_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS research_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS research_surfaced_at timestamptz,
  ADD COLUMN IF NOT EXISTS research_confirmed bigint;
-- research_confirmed: 1 = prospect said "yes that's me", -1 = "no, not me", NULL = not asked yet
