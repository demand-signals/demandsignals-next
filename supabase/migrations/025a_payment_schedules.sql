-- ── 025a_payment_schedules.sql ─────────────────────────────────────
-- Adds payment_schedules + payment_installments tables.
-- See docs/superpowers/specs/2026-04-24-stripe-payment-plans-design.md §5.
--
-- A payment_schedule belongs to one SOW + (optionally) one project.
-- It owns N payment_installments, each with its own currency, trigger,
-- amount, and status. Sum of installment amounts must match schedule
-- total_cents (enforced in app code, not DB).

CREATE TABLE IF NOT EXISTS payment_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_document_id  UUID NOT NULL REFERENCES sow_documents(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  total_cents      INT NOT NULL CHECK (total_cents >= 0),
  locked_at        TIMESTAMPTZ,  -- set when first installment moves to 'paid'; blocks edits
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
  trigger_milestone_id     UUID,  -- references project_phases.id (no FK; phases stored as JSONB on projects)
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

CREATE INDEX IF NOT EXISTS idx_payment_installments_schedule
  ON payment_installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status
  ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_time
  ON payment_installments(trigger_type, trigger_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_milestone
  ON payment_installments(trigger_milestone_id) WHERE trigger_type = 'milestone' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_trigger_payment
  ON payment_installments(trigger_payment_id) WHERE trigger_type = 'on_completion_of_payment' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_installments_invoice
  ON payment_installments(invoice_id) WHERE invoice_id IS NOT NULL;

-- RLS: service_role only (matches existing payment-touching tables like invoices)
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
