-- ── 059_retainer_ledger.sql ──────────────────────────────────────────────
-- Retainer ledger ("bill like attorneys"). One prepaid balance per CLIENT
-- (prospect); every SOW/project the client requests draws from the one pool.
-- Work (handoffs + LLM tokens) accrues as PENDING debits that an admin must
-- approve, waive ("on our dime"), or void. Depletion thresholds notify the
-- client (75%) and auto-DRAFT a re-up invoice (90%).
--
-- Spec: docs/superpowers/specs/2026-07-16-retainer-ledger-design.md
--
-- Design invariants:
--   • Dollars (integer cents) are the ledger currency. Hours are reporting only.
--   • Only status='approved' rows move the balance. pending/waived/void do not.
--   • balance_cents is a CACHE; authoritative balance =
--       SUM(approved credits) − SUM(approved debits). Recomputed on every posting.
--   • Retainer is OPT-IN per client. No ledger row → handoffs behave as today.
--   • No per-project earmarks. project_id on a debit is for reporting rollups only.
-- ──────────────────────────────────────────────────────────────────────────

-- ── 0. rate_card_roles — the 6 role-based hourly rates (SOURCE OF TRUTH) ───
-- Replaces the standalone Python rate-sheet generator + the $200 stub as the
-- single source for human-labor rates. CLIENT-FACING (these are in the signed
-- agreement). The raw LLM cost basis is NOT here — it stays in llm-rates.json
-- (internal). Only role rates + disclosed markups live in the DB.
CREATE TABLE IF NOT EXISTS rate_card_roles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                text NOT NULL UNIQUE,        -- stable slug used by code
  name               text NOT NULL,               -- display label
  hourly_rate_cents  integer NOT NULL,
  when_applied       text,                         -- rate-sheet "When applied" copy
  sort_order         integer NOT NULL DEFAULT 0,
  active             boolean NOT NULL DEFAULT true,
  no_discounts       boolean NOT NULL DEFAULT false, -- e.g. Legal
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_card_roles_rate_check CHECK (hourly_rate_cents >= 0)
);

-- Seed the 6 standard roles from dsig-standard-rate-sheet §02 (2026-07-15 v1c).
INSERT INTO rate_card_roles (key, name, hourly_rate_cents, when_applied, sort_order, no_discounts) VALUES
  ('legal',       'Legal / Attorney',              50000, 'Attorney time — contract drafting/review, IP assignment, regulatory interpretation, client-specific legal work by DSIG counsel', 1, true),
  ('executive',   'Executive / Strategy',          25000, 'Founder/principal time — strategy, contract negotiation, executive-stakeholder meetings, escalation, investor presentations on client behalf', 2, false),
  ('consulting',  'Business Consulting',           20000, 'Advisory — strategic planning, business architecture, market analysis, pricing & GTM, deep technical review without implementation', 3, false),
  ('research',    'Technical Research & Reporting', 15000, 'Research, data inventory, benchmarking, architecture & security design, analysis, weekly time+progress reporting', 4, false),
  ('engineering', 'Engineering / Development',      10000, 'Standard build — feature implementation, data extraction/normalization, testing, debugging, deployment, documentation', 5, false),
  ('admin',       'Admin / Basic',                  5000, 'Basic & administrative — invoicing, scheduling, document prep, vendor coordination, routine maintenance, expense reconciliation', 6, false)
ON CONFLICT (key) DO NOTHING;

-- ── 0b. rate_card_markups — disclosed pass-through markup tiers ────────────
-- The DISCLOSED markup percentages (client-facing, on the rate sheet). NOT the
-- underlying cost. LLM cost basis stays in llm-rates.json; this only records
-- "we add +50% to LLM, +30% to platform services" for display + invoice math.
CREATE TABLE IF NOT EXISTS rate_card_markups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  markup_bps    integer NOT NULL,                 -- basis points; 3000 = +30%
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

-- ── 1. retainer_ledgers — one balance per client ──────────────────────────
CREATE TABLE IF NOT EXISTS retainer_ledgers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id              uuid NOT NULL UNIQUE REFERENCES prospects(id) ON DELETE CASCADE,
  currency                 text NOT NULL DEFAULT 'usd',
  -- Cache of SUM(approved credits) − SUM(approved debits). Recomputed on posting.
  balance_cents            integer NOT NULL DEFAULT 0,
  lifetime_credited_cents  integer NOT NULL DEFAULT 0,
  lifetime_debited_cents   integer NOT NULL DEFAULT 0,
  -- Per-client hourly rate override for human-time debits. NULL → use the
  -- platform default in quote_config['retainer_default_hourly_rate_cents'].
  hourly_rate_cents        integer,
  -- Depletion thresholds (percent DEPLETED). NULL → platform defaults 75/90.
  notify_pct               integer NOT NULL DEFAULT 75,
  reup_pct                 integer NOT NULL DEFAULT 90,
  auto_reup_enabled        boolean NOT NULL DEFAULT true,
  -- Amount the re-up draft invoice requests. NULL → reuse the last credit amount.
  reup_target_cents        integer,
  -- Dedup stamps so thresholds fire once per depletion cycle.
  last_notified_at         timestamptz,
  last_reup_drafted_at     timestamptz,
  status                   text NOT NULL DEFAULT 'active',
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retainer_ledgers_status_check
    CHECK (status IN ('active', 'closed')),
  CONSTRAINT retainer_ledgers_notify_pct_check
    CHECK (notify_pct BETWEEN 1 AND 100),
  CONSTRAINT retainer_ledgers_reup_pct_check
    CHECK (reup_pct BETWEEN 1 AND 100)
);

COMMENT ON TABLE retainer_ledgers IS
  'One prepaid retainer balance per client (prospect). Opt-in: no row = client has no retainer, handoffs bill as before. balance_cents is a cache of approved credits − approved debits.';
COMMENT ON COLUMN retainer_ledgers.balance_cents IS
  'CACHE only. Authoritative = SUM(approved credits) − SUM(approved debits) over retainer_transactions. Recomputed every posting; verified by scripts/verify-retainer-ledger.mjs.';

-- ── 2. retainer_transactions — the ledger (append-only, status-gated) ─────
CREATE TABLE IF NOT EXISTS retainer_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id         uuid NOT NULL REFERENCES retainer_ledgers(id) ON DELETE CASCADE,
  prospect_id       uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
  direction         text NOT NULL,
  status            text NOT NULL DEFAULT 'pending',
  amount_cents      integer NOT NULL,
  source            text NOT NULL,
  -- Role billed (rate_card_roles.key). NULL on a fresh handoff debit; the
  -- admin sets it at approval, which resolves the human-hours rate.
  role              text REFERENCES rate_card_roles(key) ON UPDATE CASCADE,
  -- Source linkage
  time_entry_id     uuid REFERENCES project_time_entries(id) ON DELETE SET NULL,
  invoice_id        uuid REFERENCES invoices(id) ON DELETE SET NULL,
  -- Content
  description       text NOT NULL,
  hours             numeric,            -- reporting only; dollars are authoritative
  -- Approval / waive / void audit
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
  CONSTRAINT retainer_tx_direction_check
    CHECK (direction IN ('credit', 'debit')),
  CONSTRAINT retainer_tx_status_check
    CHECK (status IN ('pending', 'approved', 'waived', 'void')),
  -- pending debits may be $0 (role not yet chosen → human portion unpriced,
  -- and possibly no LLM cost). Anything that AFFECTS the balance (approved)
  -- must be > 0. waived/void can be any >= 0.
  CONSTRAINT retainer_tx_amount_check
    CHECK (amount_cents >= 0),
  CONSTRAINT retainer_tx_approved_amount_check
    CHECK (status <> 'approved' OR amount_cents > 0),
  CONSTRAINT retainer_tx_source_check
    CHECK (source IN ('replenish_invoice', 'handoff', 'manual_debit', 'manual_credit', 'adjustment'))
);

COMMENT ON TABLE retainer_transactions IS
  'Retainer ledger entries. Only status=approved affects the balance. pending=awaiting admin approval; waived=real work absorbed by DSIG (logged, not charged); void=wrong/duplicate entry.';
COMMENT ON COLUMN retainer_transactions.hours IS
  'Reporting/NTE framing only. The dollar amount_cents is the authoritative debit/credit.';

-- Idempotency: one time_entry_id → at most one LIVE debit (pending/approved/waived).
-- void excluded so a voided entry can be legitimately re-created.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_retainer_tx_time_entry_live
  ON retainer_transactions(time_entry_id)
  WHERE time_entry_id IS NOT NULL AND status <> 'void';

-- Approval queue: pending debits for a client, newest first.
CREATE INDEX IF NOT EXISTS idx_retainer_tx_pending
  ON retainer_transactions(prospect_id, created_at DESC)
  WHERE status = 'pending';

-- Balance recompute + history: all rows for a ledger.
CREATE INDEX IF NOT EXISTS idx_retainer_tx_ledger
  ON retainer_transactions(ledger_id, created_at DESC);

-- Per-project burn rollup (no earmark table; query-time only).
CREATE INDEX IF NOT EXISTS idx_retainer_tx_project_approved
  ON retainer_transactions(project_id)
  WHERE status = 'approved' AND direction = 'debit' AND project_id IS NOT NULL;

-- Replenish credit lookup by invoice.
CREATE INDEX IF NOT EXISTS idx_retainer_tx_invoice
  ON retainer_transactions(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- ── 3. SOW document retainer framing ──────────────────────────────────────
-- engagement_type distinguishes classic fixed-scope SOWs (unchanged render)
-- from retainer engagements (pool + hours-NTE framing, scope-only phases).
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

COMMENT ON COLUMN sow_documents.engagement_type IS
  'fixed_scope = classic itemized SOW (unchanged render). retainer = money-on-the-books engagement; phases render as scope with ± hours NTE, pricing block shows the retainer pool.';

-- ── 4. Platform config: kill switch + default hourly rate ─────────────────
INSERT INTO quote_config (key, value)
VALUES ('retainer_automation_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Platform FALLBACK hourly rate (cents) for retainer human-time debits priced
-- WITHOUT a role (manual/legacy paths). The primary path resolves rates from
-- rate_card_roles at approval; this only covers role-less pricing. $100/hr
-- (= the Engineering role rate). Edit in admin config or per-client on the ledger.
INSERT INTO quote_config (key, value)
VALUES ('retainer_default_hourly_rate_cents', '10000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── 5. RLS: admin-only (service_role bypasses; no policies = locked) ───────
ALTER TABLE retainer_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_card_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_card_markups ENABLE ROW LEVEL SECURITY;

-- ── POST-RUN VERIFICATION ─────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('retainer_ledgers','retainer_transactions');   -- expect 2
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='sow_documents'
--     AND column_name IN ('engagement_type','retainer_initial_cents',
--                         'retainer_hours_low','retainer_hours_high');   -- expect 4
