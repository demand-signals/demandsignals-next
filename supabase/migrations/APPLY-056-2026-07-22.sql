-- APPLY 056 — run in Supabase SQL Editor (project: demand-signals / hangtown / dockside as applicable)
-- Fixes silent time-entry failure on multi-day handoffs (hours > 24).

ALTER TABLE project_time_entries
  DROP CONSTRAINT IF EXISTS project_time_entries_hours_check;

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_hours_check
    CHECK (hours IS NULL OR (hours > 0 AND hours <= 1000));

-- Verify:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'project_time_entries'::regclass
  AND conname = 'project_time_entries_hours_check';
