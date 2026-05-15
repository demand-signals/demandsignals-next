-- ─────────────────────────────────────────────────────────────────────
-- Migration 053 — Handoff unification
-- ─────────────────────────────────────────────────────────────────────
-- Adds the columns needed for the new auto-derived /handoff pipeline
-- (Hunter directive 2026-05-15: "unify forever more").
--
-- All new columns are NULLABLE so historical rows stay clean — NULL
-- means "not measured" rather than "measured zero." The auto-script
-- in Y:\SKILLS\dsig-handoff\compute-session-time.cjs populates them
-- on every /handoff going forward.
--
-- Time math split (replaces the old monolithic claude_minutes):
--   claude_inference_minutes — pure model thinking time
--   claude_tool_exec_minutes — Vercel deploys, builds, agents, etc.
--   claude_minutes (existing) — sum of the above; kept for backward
--     compat with timekeeping UIs that already read it.
--
-- Token attribution (per turn → summed at handoff):
--   claude_input_tokens, claude_output_tokens,
--   claude_cache_read_tokens, claude_cache_create_tokens
--
-- Audit + replay:
--   wall_clock_minutes — first→last event span (sanity check)
--   idle_capped_minutes — Hunter time over the cap, NOT billed
--   idle_cap_minutes — the cap used (default 20)
--   model — primary model (e.g. claude-opus-4-7)
--   session_transcript_path — pointer into Y:\.claude-memory\sessions\
--     for re-derivation; canonical audit trail
--   metadata jsonb — structured payload (commits, migrations, deploy URL,
--     idle gaps) parallel to the markdown body; enables 6-months-later
--     regenerate-this-report from the same inputs
--   workstation — which dsig-NN machine ran the session
--   idempotency_key — unique per (session, handoff window); de-dupes
--     accidental double-POSTs from interrupted retries
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

-- Time math: inference + tool execution split.
-- These are intentionally separate from the existing claude_minutes
-- (which stays as the sum for backward-compat with /admin/timekeeping).
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_inference_minutes integer;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_tool_exec_minutes integer;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS hunter_idle_excess_minutes integer;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS wall_clock_minutes integer;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS idle_cap_minutes smallint;

-- Token attribution.
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_input_tokens bigint;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_output_tokens bigint;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_cache_read_tokens bigint;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS claude_cache_create_tokens bigint;

-- Audit + replay.
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS session_transcript_path text;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS workstation text;
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Idempotency: de-dupes double-POSTs across retries.
-- NULL allowed (historical rows + manual entries don't have one).
-- UNIQUE allows multiple NULLs per Postgres semantics, so existing rows are safe.
ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_time_entries_idempotency_key
  ON project_time_entries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Helpful filters for the new admin views.
CREATE INDEX IF NOT EXISTS idx_project_time_entries_workstation
  ON project_time_entries (workstation)
  WHERE workstation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_time_entries_session_transcript
  ON project_time_entries (session_transcript_path)
  WHERE session_transcript_path IS NOT NULL;

-- Documentation comments so future debuggers know what's what.
COMMENT ON COLUMN project_time_entries.claude_inference_minutes IS
  'Pure model thinking/generation time, derived from Claude Code transcript timestamps. Subset of claude_minutes. Populated by /handoff auto-script 2026-05-15+.';

COMMENT ON COLUMN project_time_entries.claude_tool_exec_minutes IS
  'Tool execution time (Vercel deploys, npm builds, WebFetch, subagent runs, etc.) measured between assistant tool_use and corresponding tool_result. Subset of claude_minutes. Populated by /handoff auto-script 2026-05-15+.';

COMMENT ON COLUMN project_time_entries.hunter_idle_excess_minutes IS
  'Hunter idle time over the cap (default 20 min). Captured for audit but NOT included in hunter_minutes. Populated by /handoff auto-script 2026-05-15+.';

COMMENT ON COLUMN project_time_entries.wall_clock_minutes IS
  'Full session wall-clock span first→last event. Sanity check against active-engagement minutes. Populated by /handoff auto-script 2026-05-15+.';

COMMENT ON COLUMN project_time_entries.idle_cap_minutes IS
  'The idle-gap cap (in minutes) used for this entry. Default 20 (locked 2026-05-15). NULL for manual or pre-auto-derivation entries.';

COMMENT ON COLUMN project_time_entries.session_transcript_path IS
  'NAS path to the synced session transcript at Y:\.claude-memory\sessions\<date>\<workstation>\<sessionid>.jsonl. Authoritative audit trail for re-derivation.';

COMMENT ON COLUMN project_time_entries.workstation IS
  '$env:COMPUTERNAME at handoff time — dsig-01, dsig-02, etc. Identifies which workstation ran the session.';

COMMENT ON COLUMN project_time_entries.metadata IS
  'Structured payload parallel to project_notes.body. Shape: { commits: [{sha, message}], migrations: {range, applied_status}, deploy: {url, aliased_to}, idle_gaps: [{at, minutes}], verification: {commits_verified, migrations_verified, deploy_verified} }.';

COMMENT ON COLUMN project_time_entries.idempotency_key IS
  'sha256(session_id + previous_handoff_ts). Prevents double-POST on retry. NULL on manual entries and historical rows.';

COMMIT;

-- ── POST-RUN VERIFICATION ─────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'project_time_entries'
--   AND column_name IN (
--     'claude_inference_minutes', 'claude_tool_exec_minutes',
--     'hunter_idle_excess_minutes', 'wall_clock_minutes', 'idle_cap_minutes',
--     'claude_input_tokens', 'claude_output_tokens',
--     'claude_cache_read_tokens', 'claude_cache_create_tokens',
--     'model', 'session_transcript_path', 'workstation',
--     'metadata', 'idempotency_key'
--   )
-- ORDER BY column_name;
--
-- Expected: 14 rows, all is_nullable='YES'.
