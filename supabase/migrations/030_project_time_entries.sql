-- 030: Project time tracking.
-- Per CLAUDE.md §11: time entries per project, optionally tagged to phase or
-- deliverable. Hours are stored as numeric(6,2) for sub-hour precision
-- without floating-point drift.

CREATE TABLE IF NOT EXISTS project_time_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Phase + deliverable refs are jsonb-internal IDs (no FK; see projects.phases shape).
  phase_id        uuid,
  deliverable_id  uuid,
  hours           numeric(6,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description     text,
  billable        boolean NOT NULL DEFAULT true,
  hourly_rate_cents integer,        -- Optional override; null falls back to project default
  logged_at       date NOT NULL DEFAULT CURRENT_DATE,
  logged_by       text,             -- email of admin who logged it
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_time_entries_project_id ON project_time_entries (project_id);
CREATE INDEX IF NOT EXISTS idx_project_time_entries_phase_id   ON project_time_entries (phase_id);
CREATE INDEX IF NOT EXISTS idx_project_time_entries_logged_at  ON project_time_entries (logged_at DESC);

-- RLS: service_role only (admin endpoints). Public has no access.
ALTER TABLE project_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_time_entries_service_all ON project_time_entries;
CREATE POLICY project_time_entries_service_all
  ON project_time_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
