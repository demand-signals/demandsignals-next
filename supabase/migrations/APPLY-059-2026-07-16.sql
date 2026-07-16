-- ══════════════════════════════════════════════════════════════════════════
-- APPLY-059 — 2026-07-16 — Retainer Ledger + Role-Based Rate Card
-- ══════════════════════════════════════════════════════════════════════════
-- Paste this ENTIRE file into the Supabase Studio SQL Editor and run once.
-- Web-editor-safe: fully inlined, no \i / \echo (psql-only meta-commands).
-- Idempotent: safe to re-run (IF NOT EXISTS / ON CONFLICT / DROP-then-ADD).
--
-- Source: supabase/migrations/059_retainer_ledger.sql
-- Spec:   docs/superpowers/specs/2026-07-16-retainer-ledger-design.md
--
-- Creates:
--   rate_card_roles (6 seeded roles), rate_card_markups (2 seeded tiers),
--   retainer_ledgers, retainer_transactions (+ indexes),
--   sow_documents.{engagement_type, retainer_initial_cents,
--                  retainer_hours_low, retainer_hours_high},
--   quote_config['retainer_automation_enabled', 'retainer_default_hourly_rate_cents'].
-- Verification SELECTs at the end must return the noted counts.
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

-- 0. rate_card_roles — 6 role-based hourly rates (source of truth) ───────────
CREATE TABLE IF NOT EXISTS rate_card_roles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                text NOT NULL UNIQUE,
  name               text NOT NULL,
  hourly_rate_cents  integer NOT NULL,
  when_applied       text,
  sort_order         integer NOT NULL DEFAULT 0,
  active             boolean NOT NULL DEFAULT true,
  no_discounts       boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_card_roles_rate_check CHECK (hourly_rate_cents >= 0)
);

INSERT INTO rate_card_roles (key, name, hourly_rate_cents, when_applied, sort_order, no_discounts) VALUES
  ('legal',       'Legal / Attorney',              50000, 'Attorney time — contract drafting/review, IP assignment, regulatory interpretation, client-specific legal work by DSIG counsel', 1, true),
  ('executive',   'Executive / Strategy',          25000, 'Founder/principal time — strategy, contract negotiation, executive-stakeholder meetings, escalation, investor presentations on client behalf', 2, false),
  ('consulting',  'Business Consulting',           20000, 'Advisory — strategic planning, business architecture, market analysis, pricing & GTM, deep technical review without implementation', 3, false),
  ('research',    'Technical Research & Reporting', 15000, 'Research, data inventory, benchmarking, architecture & security design, analysis, weekly time+progress reporting', 4, false),
  ('engineering', 'Engineering / Development',      10000, 'Standard build — feature implementation, data extraction/normalization, testing, debugging, deployment, documentation', 5, false),
  ('admin',       'Admin / Basic',                  5000, 'Basic & administrative — invoicing, scheduling, document prep, vendor coordination, routine maintenance, expense reconciliation', 6, false)
ON CONFLICT (key) DO NOTHING;

-- 0b. rate_card_markups — disclosed pass-through markup tiers ────────────────
CREATE TABLE IF NOT EXISTS rate_card_markups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  markup_bps    integer NOT NULL,
  description   text,
  sort_order    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_card_markups_bps_check CHECK (markup_bps >= 0)
);

INSERT INTO rate_card_markups (key, name, markup_bps, description, sort_order) VALUES
  ('platform', 'Platform & infrastructure services', 3000, 'Hosting, DB, storage, DNS, email, analytics, payments, dev infra — cost + 30% (operational carry, not arbitrage)', 1),
  ('llm',      'AI / LLM API & token consumption',   5000, 'Inbound + outbound tokens at provider/OpenRouter cost + 50% (incl. internal infrastructure). Cost basis internal (llm-rates.json).', 2)
ON CONFLICT (key) DO NOTHING;

-- 1. retainer_ledgers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retainer_ledgers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id              uuid NOT NULL UNIQUE REFERENCES prospects(id) ON DELETE CASCADE,
  currency                 text NOT NULL DEFAULT 'usd',
  balance_cents            integer NOT NULL DEFAULT 0,
  lifetime_credited_cents  integer NOT NULL DEFAULT 0,
  lifetime_debited_cents   integer NOT NULL DEFAULT 0,
  hourly_rate_cents        integer,
  notify_pct               integer NOT NULL DEFAULT 75,
  reup_pct                 integer NOT NULL DEFAULT 90,
  auto_reup_enabled        boolean NOT NULL DEFAULT true,
  reup_target_cents        integer,
  last_notified_at         timestamptz,
  last_reup_drafted_at     timestamptz,
  status                   text NOT NULL DEFAULT 'active',
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retainer_ledgers_status_check     CHECK (status IN ('active', 'closed')),
  CONSTRAINT retainer_ledgers_notify_pct_check CHECK (notify_pct BETWEEN 1 AND 100),
  CONSTRAINT retainer_ledgers_reup_pct_check   CHECK (reup_pct BETWEEN 1 AND 100)
);

-- 2. retainer_transactions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retainer_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id         uuid NOT NULL REFERENCES retainer_ledgers(id) ON DELETE CASCADE,
  prospect_id       uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
  direction         text NOT NULL,
  status            text NOT NULL DEFAULT 'pending',
  amount_cents      integer NOT NULL,
  source            text NOT NULL,
  role              text REFERENCES rate_card_roles(key) ON UPDATE CASCADE,
  time_entry_id     uuid REFERENCES project_time_entries(id) ON DELETE SET NULL,
  invoice_id        uuid REFERENCES invoices(id) ON DELETE SET NULL,
  description       text NOT NULL,
  hours             numeric,
  approved_by       text,
  approved_at       timestamptz,
  waived_by         text,
  waived_at         timestamptz,
  waive_reason      text,
  voided_by         text,
  voided_at         timestamptz,
  void_reason       text,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retainer_tx_direction_check CHECK (direction IN ('credit', 'debit')),
  CONSTRAINT retainer_tx_status_check    CHECK (status IN ('pending', 'approved', 'waived', 'void')),
  CONSTRAINT retainer_tx_amount_check    CHECK (amount_cents >= 0),
  CONSTRAINT retainer_tx_approved_amount_check CHECK (status <> 'approved' OR amount_cents > 0),
  CONSTRAINT retainer_tx_source_check
    CHECK (source IN ('replenish_invoice', 'handoff', 'manual_debit', 'manual_credit', 'adjustment'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_retainer_tx_time_entry_live
  ON retainer_transactions(time_entry_id)
  WHERE time_entry_id IS NOT NULL AND status <> 'void';

CREATE INDEX IF NOT EXISTS idx_retainer_tx_pending
  ON retainer_transactions(prospect_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_retainer_tx_ledger
  ON retainer_transactions(ledger_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_retainer_tx_project_approved
  ON retainer_transactions(project_id)
  WHERE status = 'approved' AND direction = 'debit' AND project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_retainer_tx_invoice
  ON retainer_transactions(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- 3. SOW retainer framing ───────────────────────────────────────────────────
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS engagement_type text NOT NULL DEFAULT 'fixed_scope';
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS retainer_initial_cents integer;
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS retainer_hours_low numeric;
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS retainer_hours_high numeric;
ALTER TABLE sow_documents
  DROP CONSTRAINT IF EXISTS sow_documents_engagement_type_check;
ALTER TABLE sow_documents
  ADD CONSTRAINT sow_documents_engagement_type_check
    CHECK (engagement_type IN ('fixed_scope', 'retainer'));

-- 4. Platform config: kill switch + default hourly rate ─────────────────────
INSERT INTO quote_config (key, value)
VALUES ('retainer_automation_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- $100/hr fallback (= Engineering role rate) for role-less pricing only.
-- The primary path resolves rates from rate_card_roles at approval.
INSERT INTO quote_config (key, value)
VALUES ('retainer_default_hourly_rate_cents', '10000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. RLS (admin-only: service_role bypasses; no policies = locked) ───────────
ALTER TABLE rate_card_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_card_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_transactions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ══ VERIFICATION (run after COMMIT; expect the noted results) ═══════════════
-- Expect 4 rows: rate_card_markups, rate_card_roles, retainer_ledgers, retainer_transactions
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('rate_card_roles','rate_card_markups','retainer_ledgers','retainer_transactions')
ORDER BY table_name;

-- Expect 6 seeded roles ($500 legal → $50 admin)
SELECT key, name, hourly_rate_cents FROM rate_card_roles ORDER BY sort_order;

-- Expect 2 markup tiers (platform 3000 bps, llm 5000 bps)
SELECT key, markup_bps FROM rate_card_markups ORDER BY sort_order;

-- Expect 4 columns on sow_documents
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'sow_documents'
  AND column_name IN ('engagement_type','retainer_initial_cents','retainer_hours_low','retainer_hours_high')
ORDER BY column_name;

-- Expect 2 config rows
SELECT key, value FROM quote_config
WHERE key IN ('retainer_automation_enabled','retainer_default_hourly_rate_cents')
ORDER BY key;
