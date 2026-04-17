-- Track the person we're chatting with, separate from the business name.
-- "Jefferson, owner" or "Alex Chen, marketing director".
-- Used for admin handoff so Hunter knows who to ask for when calling.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS person_name text,
  ADD COLUMN IF NOT EXISTS person_role text;

-- Add to prospects too so the CRM enrichment flows it through.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS owner_role text;
