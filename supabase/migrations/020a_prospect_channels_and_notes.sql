-- 020a: Prospect social/review channels + stacked notes timeline.
-- channels: jsonb blob of all the prospect's external URLs (socials, reviews, etc)
-- prospect_notes: append-only timeline of admin notes (stacked newest-first in UI)

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Expected shape (not enforced; flexible jsonb):
-- {
--   "website": "...", "google_business": "...", "yelp": "...",
--   "facebook": "...", "instagram": "...", "linkedin": "...",
--   "tiktok": "...", "youtube": "...", "twitter_x": "...",
--   "pinterest": "...", "bbb": "...", "angi": "...",
--   "trustpilot": "...", "nextdoor": "...",
--   "other": [{"label": "Chamber profile", "url": "..."}, ...]
-- }

CREATE TABLE IF NOT EXISTS prospect_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_by  text,  -- admin user email or system tag
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_notes_prospect_id
  ON prospect_notes (prospect_id, created_at DESC);

ALTER TABLE prospect_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read prospect_notes" ON prospect_notes;
DROP POLICY IF EXISTS "Admins write prospect_notes" ON prospect_notes;
CREATE POLICY "Admins read prospect_notes" ON prospect_notes FOR SELECT USING (is_admin());
CREATE POLICY "Admins write prospect_notes" ON prospect_notes FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON prospect_notes FROM anon, authenticated;
