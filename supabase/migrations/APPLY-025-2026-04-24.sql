-- ════════════════════════════════════════════════════════════════════
-- APPLY-025-2026-04-24.sql
-- Run this in Supabase SQL Editor (web) to apply migrations 025a–025e.
-- Idempotent: each block uses IF NOT EXISTS guards.
--
-- Adds:
--   • payment_schedules + payment_installments tables (Plan B foundation)
--   • sow_documents.parent_sow_id (change orders)
--   • invoices.payment_installment_id (webhook → installment cascade)
--   • subscriptions.cycle_cap + paused_until (Plan C)
--   • receipts.payment_method extended to include 'tik'
-- ════════════════════════════════════════════════════════════════════

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
