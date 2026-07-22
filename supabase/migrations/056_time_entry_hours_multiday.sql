-- 056: allow multi-day handoff time entries to exceed 24 hours.
--
-- ROOT CAUSE (2026-07-22): the block-time /handoff model aggregates a
-- project's WHOLE work window into one time entry — which for a multi-day
-- session (e.g. BIRD Michigan MRF: hunter 1421m + claude 371m = 29.87h)
-- legitimately exceeds 24 hours. The migration-048 CHECK
-- `hours IS NULL OR (hours > 0 AND hours <= 24)` rejected the insert.
-- The note (separate table, no such constraint) wrote fine, so the
-- endpoint returned 200 with a `warning` — and the time entry + all LLM
-- billing SILENTLY never landed. This is why long handoffs posted a note
-- but no hours/LLM.
--
-- The 24h ceiling was designed for single-day MANUAL entries and is still
-- sensible there. But handoff-sourced block-time entries span days by
-- design. Raise the ceiling to a full billing period (a month of
-- continuous wall-clock is 744h; cap at 1000h as a sanity bound that still
-- catches a genuinely absurd value like a mis-parsed epoch).

ALTER TABLE project_time_entries
  DROP CONSTRAINT IF EXISTS project_time_entries_hours_check;

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_hours_check
    CHECK (hours IS NULL OR (hours > 0 AND hours <= 1000));

-- The minute columns were already unbounded above (>= 0 only). The Zod
-- layer separately caps hunter_minutes/claude_minutes at one week each;
-- if block-time ever exceeds that, raise the Zod max too (notes-and-time.ts).
