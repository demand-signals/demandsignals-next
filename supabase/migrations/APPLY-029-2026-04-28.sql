-- ── APPLY-029-2026-04-28: Quick inquiry form ──────────────────────
-- Run in Supabase SQL Editor in this order. Idempotent (uses IF NOT
-- EXISTS / OR REPLACE everywhere).

\echo 'Running 029a_prospect_inquiries...'
\i 029a_prospect_inquiries.sql

\echo 'Running 029b_prospects_inquiry_timestamps...'
\i 029b_prospects_inquiry_timestamps.sql

\echo 'Running 029c_handle_inquiry_submission...'
\i 029c_handle_inquiry_submission.sql

\echo 'APPLY-029 complete. Verify:'
\echo '  SELECT count(*) FROM prospect_inquiries;     -- should be 0'
\echo '  SELECT first_inquiry_at FROM prospects LIMIT 1; -- column exists'
\echo '  SELECT proname FROM pg_proc WHERE proname = ''handle_inquiry_submission'';  -- 1 row'
