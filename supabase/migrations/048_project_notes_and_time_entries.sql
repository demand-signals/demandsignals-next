-- ── 048: project notes + time-entries extension + portal digests ──
-- Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §1
-- Plan: docs/superpowers/plans/2026-05-07-client-portal-v1-plan.md Task 2
--
-- Note: project_time_entries already exists from migration 030 with a
-- different shape (hours numeric, billable, hourly_rate_cents, logged_at).
-- We EXTEND that table with handoff-flow columns; the legacy columns
-- remain for manual time-log entries.

-- Project notes — every CLIENT UPDATE artifact from /handoff lands
-- here, plus any manually logged note. Drives the project timeline
-- shown to both admin and (filtered) client. Drives the daily digest.
CREATE TABLE IF NOT EXISTS project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  title text,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'client',
  source text NOT NULL,
  phase_id uuid,
  deliverable_id uuid,
  session_started_at timestamptz,
  session_ended_at timestamptz,
  client_sent_at timestamptz,
  client_send_id uuid REFERENCES email_engagement(id) ON DELETE SET NULL,
  suppressed boolean NOT NULL DEFAULT false,
  suppressed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility IN ('internal', 'client')),
  CHECK (source IN ('handoff', 'manual', 'import'))
);

CREATE INDEX IF NOT EXISTS idx_pn_digest_pool
  ON project_notes(prospect_id, created_at DESC)
  WHERE visibility = 'client' AND client_sent_at IS NULL AND suppressed = false;

CREATE INDEX IF NOT EXISTS idx_pn_project_timeline
  ON project_notes(project_id, created_at DESC);

COMMENT ON TABLE project_notes IS
  'Project-scoped notes. Source=handoff rows are written by the /handoff slash command from session CLIENT UPDATE artifacts. Once client_sent_at IS NOT NULL the row is locked from edits.';

-- Extend project_time_entries (created in migration 030) with
-- handoff-flow columns. Hunter time = full session wall-clock span;
-- Claude time = processing time only. Both stored as integer minutes.
-- The legacy `hours numeric` column stays for manual time-log entries
-- and remains the canonical aggregate for billing rate calculations.
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS project_note_id uuid REFERENCES project_notes(id) ON DELETE SET NULL;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS hunter_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS session_started_at timestamptz;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS session_ended_at timestamptz;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS source text;

-- The existing CHECK on hours forbids null. Drop it; new rows from
-- /handoff don't populate `hours` (they use minute splits instead).
-- Manual time-log rows continue to populate `hours` as before.
ALTER TABLE project_time_entries
  ALTER COLUMN hours DROP NOT NULL;

ALTER TABLE project_time_entries
  DROP CONSTRAINT IF EXISTS project_time_entries_hours_check;

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_hours_check
    CHECK (hours IS NULL OR (hours > 0 AND hours <= 24));

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_hunter_minutes_check
    CHECK (hunter_minutes >= 0);

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_claude_minutes_check
    CHECK (claude_minutes >= 0);

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_source_check
    CHECK (source IS NULL OR source IN ('handoff', 'manual'));

CREATE INDEX IF NOT EXISTS idx_pte_prospect
  ON project_time_entries(prospect_id, session_ended_at DESC);

CREATE INDEX IF NOT EXISTS idx_pte_project_session
  ON project_time_entries(project_id, session_ended_at DESC);

COMMENT ON COLUMN project_time_entries.hunter_minutes IS
  'Hunter time = full session wall-clock span (prompt time + Claude processing). Integer minutes. Used by /handoff source rows.';

COMMENT ON COLUMN project_time_entries.claude_minutes IS
  'Claude processing time only. Integer minutes. Used by /handoff source rows.';

-- Daily digest log — one row per digest sent. Drives audit and
-- dedup defense (cron crashes mid-run shouldn't double-send).
CREATE TABLE IF NOT EXISTS portal_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  period_start_at timestamptz NOT NULL,
  period_end_at timestamptz NOT NULL,
  note_ids uuid[] NOT NULL,
  total_minutes integer NOT NULL,
  email_send_id uuid REFERENCES email_engagement(id) ON DELETE SET NULL,
  sms_send_id uuid,
  email_delivered boolean NOT NULL DEFAULT false,
  sms_delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prospect_id, period_start_at)
);

CREATE INDEX IF NOT EXISTS idx_pd_audit
  ON portal_digests(prospect_id, period_start_at DESC);

COMMENT ON TABLE portal_digests IS
  'One row per daily digest. UNIQUE(prospect_id, period_start_at) prevents double-send if cron is invoked twice for the same window.';

-- Default "General Support" project per existing client.
INSERT INTO projects (id, prospect_id, name, status, created_at)
SELECT gen_random_uuid(), p.id, 'General Support', 'active', now()
FROM prospects p
WHERE p.is_client = true
  AND NOT EXISTS (
    SELECT 1 FROM projects pr
    WHERE pr.prospect_id = p.id AND pr.name = 'General Support'
  );

-- Kill switch for digest dispatch.
INSERT INTO quote_config (key, value)
VALUES ('portal_digest_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_digests ENABLE ROW LEVEL SECURITY;
-- project_time_entries already has RLS enabled from migration 030.
