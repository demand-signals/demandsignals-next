-- ─────────────────────────────────────────────────────────────────────
-- Migration 052 — extend prospect_inquiries.source CHECK constraint
-- ─────────────────────────────────────────────────────────────────────
-- The original constraint at migration 029a allowed only:
--   ('quick_form', 'contact_form', 'portal_reply')
--
-- Subsequent code shipped two new accepted source values that the DB
-- never learned about:
--
--   'inquiry_strip'  — three-channel contact box rendered globally in
--                      root layout (commit 353f32f, 2026-05-13).
--   'exit_intent'    — old exit-intent modal (now removed in commit
--                      a535efe, but the InquirySource union still
--                      accepts the value so stale clients caching
--                      the old JS don't 500).
--
-- Symptom on 2026-05-14 (Hunter): a real lead filled out the
-- /team-page InquiryStrip form, the API returned 500 with "Could not
-- record inquiry", lead was lost. Root cause: source='inquiry_strip'
-- failed the CHECK constraint with code 23514.
--
-- Per project rule §12 — inlined for Supabase web SQL editor.
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

-- Drop the old constraint (idempotent: IF EXISTS handles re-runs).
ALTER TABLE prospect_inquiries
  DROP CONSTRAINT IF EXISTS prospect_inquiries_source_check;

-- Add the extended constraint with all 5 accepted values.
ALTER TABLE prospect_inquiries
  ADD CONSTRAINT prospect_inquiries_source_check
  CHECK (source IN ('quick_form', 'contact_form', 'portal_reply', 'inquiry_strip', 'exit_intent'));

COMMIT;

-- ── POST-RUN VERIFICATION ─────────────────────────────────────────────
-- Confirm the constraint accepts the new values:
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'prospect_inquiries_source_check';
--
-- Expected:
--   CHECK ((source = ANY (ARRAY['quick_form'::text,
--          'contact_form'::text, 'portal_reply'::text,
--          'inquiry_strip'::text, 'exit_intent'::text])))
