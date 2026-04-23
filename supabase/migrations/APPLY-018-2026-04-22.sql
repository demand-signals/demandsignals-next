-- APPLY-018-2026-04-22.sql
-- Run against Supabase to apply the 018a migration.
-- Execute via: supabase db push, or paste in Supabase SQL editor.

-- ── 018a: SOW phases + cadence ─────────────────────────────────────

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '[]'::jsonb;
-- 018b: Client lifecycle on prospects + project linkage to SOW.
-- When a SOW is accepted, the prospect becomes a client (is_client=true,
-- became_client_at timestamptz). A project row is materialized from the
-- accepted SOW (projects.sow_document_id FK).

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS is_client boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS became_client_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospects_is_client
  ON prospects (is_client, became_client_at DESC)
  WHERE is_client = true;

-- Link project back to the SOW it was born from.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS sow_document_id uuid REFERENCES sow_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_sow_document_id ON projects (sow_document_id);

-- Project phase shape (jsonb, documented here):
-- [
--   {
--     "id": "<uuid>",  -- matches sow phase id
--     "name": "Phase 1",
--     "description": "...",
--     "status": "pending" | "in_progress" | "completed",
--     "completed_at": null | "2026-05-01T...",
--     "deliverables": [
--       {
--         "id": "<uuid>",
--         "service_id": null | "...",
--         "name": "...",
--         "description": "...",
--         "cadence": "one_time" | "monthly" | "quarterly" | "annual",
--         "quantity": 1,
--         "hours": null,
--         "unit_price_cents": 0,
--         "line_total_cents": 0,
--         "status": "pending" | "delivered",
--         "delivered_at": null | "..."
--       }
--     ]
--   }
-- ]
