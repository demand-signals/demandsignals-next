-- APPLY-018-2026-04-22.sql
-- Run against Supabase to apply the 018a migration.
-- Execute via: supabase db push, or paste in Supabase SQL editor.

-- ── 018a: SOW phases + cadence ─────────────────────────────────────

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '[]'::jsonb;
