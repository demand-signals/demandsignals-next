-- ── 051: project_time_entries.category + coverage refs ──
-- Hunter, 2026-05-08: replace the binary `billable boolean` with a
-- richer 5-state category, plus optional FK refs that link the entry to
-- the document covering its cost (a bulk-payment invoice OR a recurring
-- services subscription). Lets us answer "what's burning down their
-- deposit?" and "what's not yet attached to anything billable?" with a
-- single query.
--
-- Backfill rule: existing rows with billable=true → 'billable',
-- billable=false → 'non_billable'. Future rows can reclassify into
-- bulk_payment / services_contract / internal as work is attached.

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS covered_by_invoice_id uuid
    REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE project_time_entries
  ADD COLUMN IF NOT EXISTS covered_by_subscription_id uuid
    REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Backfill from the legacy boolean. Only writes where category is null
-- (idempotent on re-run).
UPDATE project_time_entries
SET category = CASE WHEN billable THEN 'billable' ELSE 'non_billable' END
WHERE category IS NULL;

ALTER TABLE project_time_entries
  ALTER COLUMN category SET DEFAULT 'billable';

ALTER TABLE project_time_entries
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE project_time_entries
  DROP CONSTRAINT IF EXISTS project_time_entries_category_check;

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_category_check
    CHECK (category IN (
      'billable',
      'non_billable',
      'bulk_payment',
      'services_contract',
      'internal'
    ));

-- Coverage-FK consistency: bulk_payment requires invoice,
-- services_contract requires subscription, and the other categories
-- forbid both. Keeps the data clean by construction.
ALTER TABLE project_time_entries
  DROP CONSTRAINT IF EXISTS project_time_entries_coverage_match_check;

ALTER TABLE project_time_entries
  ADD CONSTRAINT project_time_entries_coverage_match_check
    CHECK (
      (category = 'bulk_payment'      AND covered_by_invoice_id      IS NOT NULL AND covered_by_subscription_id IS NULL)
      OR
      (category = 'services_contract' AND covered_by_subscription_id IS NOT NULL AND covered_by_invoice_id      IS NULL)
      OR
      (category IN ('billable', 'non_billable', 'internal')
        AND covered_by_invoice_id IS NULL AND covered_by_subscription_id IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_pte_category
  ON project_time_entries(project_id, category);

CREATE INDEX IF NOT EXISTS idx_pte_covered_invoice
  ON project_time_entries(covered_by_invoice_id)
  WHERE covered_by_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pte_covered_subscription
  ON project_time_entries(covered_by_subscription_id)
  WHERE covered_by_subscription_id IS NOT NULL;

COMMENT ON COLUMN project_time_entries.category IS
  '5-state billing categorization. billable = standard hourly, not yet attached. non_billable = written off. bulk_payment = covered by a one-time invoice (FK on covered_by_invoice_id). services_contract = covered by a recurring subscription (FK on covered_by_subscription_id). internal = DSIG-internal, no client billing.';
COMMENT ON COLUMN project_time_entries.covered_by_invoice_id IS
  'When category=bulk_payment, points at the invoice (typically a deposit / prepay) whose cents are being burned down by this entry.';
COMMENT ON COLUMN project_time_entries.covered_by_subscription_id IS
  'When category=services_contract, points at the recurring subscription that covers this entry under its monthly fee.';
