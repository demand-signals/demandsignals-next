-- ════════════════════════════════════════════════════════════════════
-- APPLY-025-2026-04-24.sql
-- Run this in Supabase SQL Editor (web) to apply migrations 019a + 025a–025e.
-- Idempotent: each block uses IF NOT EXISTS guards.
--
-- Adds:
--   • trade_credits + trade_credit_drawdowns tables (019a — TIK ledger,
--     was previously listed as applied in CLAUDE.md but not actually
--     applied to this Supabase project; 025a depends on it)
--   • payment_schedules + payment_installments tables (Plan B foundation)
--   • sow_documents.parent_sow_id (change orders)
--   • invoices.payment_installment_id (webhook → installment cascade)
--   • subscriptions.cycle_cap + paused_until (Plan C)
--   • receipts.payment_method extended to include 'tik'
-- ════════════════════════════════════════════════════════════════════

-- ── 019a_trade_credits.sql (prerequisite for 025a payment_installments FK) ─
CREATE TABLE IF NOT EXISTS trade_credits (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id            uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  sow_document_id        uuid REFERENCES sow_documents(id) ON DELETE SET NULL,
  invoice_id             uuid REFERENCES invoices(id) ON DELETE SET NULL,
  original_amount_cents  integer NOT NULL CHECK (original_amount_cents >= 0),
  remaining_cents        integer NOT NULL CHECK (remaining_cents >= 0),
  description            text NOT NULL,
  status                 text NOT NULL DEFAULT 'outstanding'
                         CHECK (status IN ('outstanding','partial','fulfilled','written_off')),
  opened_at              timestamptz NOT NULL DEFAULT now(),
  closed_at              timestamptz,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_credits_prospect ON trade_credits (prospect_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_credits_outstanding
  ON trade_credits (prospect_id) WHERE status IN ('outstanding','partial');
CREATE INDEX IF NOT EXISTS idx_trade_credits_sow ON trade_credits (sow_document_id) WHERE sow_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trade_credits_invoice ON trade_credits (invoice_id) WHERE invoice_id IS NOT NULL;

ALTER TABLE trade_credits ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credits' AND policyname = 'Admins read trade_credits') THEN
    CREATE POLICY "Admins read trade_credits" ON trade_credits FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credits' AND policyname = 'Admins insert trade_credits') THEN
    CREATE POLICY "Admins insert trade_credits" ON trade_credits FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credits' AND policyname = 'Admins update trade_credits') THEN
    CREATE POLICY "Admins update trade_credits" ON trade_credits FOR UPDATE USING (is_admin());
  END IF;
END $$;

REVOKE ALL ON trade_credits FROM anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trade_credits_set_updated_at') THEN
    CREATE TRIGGER trade_credits_set_updated_at BEFORE UPDATE ON trade_credits
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Draw-downs: each row records a trade delivery from client to DSIG.
CREATE TABLE IF NOT EXISTS trade_credit_drawdowns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_credit_id  uuid NOT NULL REFERENCES trade_credits(id) ON DELETE CASCADE,
  amount_cents     integer NOT NULL CHECK (amount_cents > 0),
  description      text NOT NULL,
  delivered_on     date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_credit_drawdowns_credit
  ON trade_credit_drawdowns (trade_credit_id, delivered_on DESC);

ALTER TABLE trade_credit_drawdowns ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credit_drawdowns' AND policyname = 'Admins read drawdowns') THEN
    CREATE POLICY "Admins read drawdowns" ON trade_credit_drawdowns FOR SELECT USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credit_drawdowns' AND policyname = 'Admins insert drawdowns') THEN
    CREATE POLICY "Admins insert drawdowns" ON trade_credit_drawdowns FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credit_drawdowns' AND policyname = 'Admins update drawdowns') THEN
    CREATE POLICY "Admins update drawdowns" ON trade_credit_drawdowns FOR UPDATE USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_credit_drawdowns' AND policyname = 'Admins delete drawdowns') THEN
    CREATE POLICY "Admins delete drawdowns" ON trade_credit_drawdowns FOR DELETE USING (is_admin());
  END IF;
END $$;

REVOKE ALL ON trade_credit_drawdowns FROM anon;

-- TIK fields on SOW + invoice
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS trade_credit_cents integer NOT NULL DEFAULT 0 CHECK (trade_credit_cents >= 0),
  ADD COLUMN IF NOT EXISTS trade_credit_description text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS trade_credit_cents integer NOT NULL DEFAULT 0 CHECK (trade_credit_cents >= 0),
  ADD COLUMN IF NOT EXISTS trade_credit_description text,
  ADD COLUMN IF NOT EXISTS trade_credit_id uuid REFERENCES trade_credits(id) ON DELETE SET NULL;

-- ── 025a_payment_schedules.sql ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_document_id  UUID NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  total_cents      INT NOT NULL CHECK (total_cents >= 0),
  locked_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_sow ON payment_schedules(sow_document_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_project ON payment_schedules(project_id);

CREATE TABLE IF NOT EXISTS payment_installments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id              UUID NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
  sequence                 INT NOT NULL,
  amount_cents             INT NOT NULL CHECK (amount_cents > 0),
  amount_paid_cents        INT NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  currency_type            TEXT NOT NULL CHECK (currency_type IN ('cash','tik')),
  expected_payment_method  TEXT CHECK (
    expected_payment_method IS NULL
    OR expected_payment_method IN ('card','check','wire','ach','unspecified')
  ),
  trigger_type             TEXT NOT NULL CHECK (
    trigger_type IN ('on_acceptance','time','milestone','on_completion_of_payment')
  ),
  trigger_date             DATE,
  trigger_milestone_id     UUID,
  trigger_payment_id       UUID REFERENCES payment_installments(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','invoice_issued','partially_paid','paid','tik_open','cancelled')
  ),
  invoice_id               UUID REFERENCES invoices(id) ON DELETE SET NULL,
  trade_credit_id          UUID REFERENCES trade_credits(id) ON DELETE SET NULL,
  description              TEXT,
  fired_at                 TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_payment_installments_schedule ON payment_installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_time ON payment_installments(trigger_type, trigger_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_milestone ON payment_installments(trigger_milestone_id) WHERE trigger_type = 'milestone' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_payment ON payment_installments(trigger_payment_id) WHERE trigger_type = 'on_completion_of_payment' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_invoice ON payment_installments(invoice_id) WHERE invoice_id IS NOT NULL;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- ── 025b_sow_change_orders.sql ──────────────────────────────────────
ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS parent_sow_id UUID REFERENCES sow_documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sow_documents_parent ON sow_documents(parent_sow_id) WHERE parent_sow_id IS NOT NULL;

-- ── 025d_invoice_installment_link.sql ──────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_installment_id UUID REFERENCES payment_installments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_installment ON invoices(payment_installment_id) WHERE payment_installment_id IS NOT NULL;

-- ── 025c_subscription_caps_and_pause.sql ────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cycle_cap INT,
  ADD COLUMN IF NOT EXISTS paused_until DATE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_paused_until ON subscriptions(paused_until) WHERE paused_until IS NOT NULL;

-- ── 025e_receipts_tik_method.sql ────────────────────────────────────
DO $$
DECLARE
  conname_to_drop TEXT;
BEGIN
  SELECT conname INTO conname_to_drop
  FROM pg_constraint
  WHERE conrelid = 'receipts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_method%';
  IF conname_to_drop IS NOT NULL THEN
    EXECUTE format('ALTER TABLE receipts DROP CONSTRAINT %I', conname_to_drop);
  END IF;
END $$;
ALTER TABLE receipts
  ADD CONSTRAINT receipts_payment_method_check
  CHECK (payment_method IN (
    'check', 'wire', 'stripe', 'cash', 'trade', 'tik', 'zero_balance', 'ach', 'card', 'manual_card', 'other'
  ));
