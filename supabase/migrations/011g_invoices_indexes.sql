-- 011g: Indexes for common query patterns.

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_uuid
  ON invoices (public_uuid);

CREATE INDEX IF NOT EXISTS idx_invoices_supersedes
  ON invoices (supersedes_invoice_id)
  WHERE supersedes_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_auto_trigger
  ON invoices (auto_trigger)
  WHERE auto_trigger IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_auto_draft_queue
  ON invoices (created_at DESC)
  WHERE auto_generated = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_invoices_kind
  ON invoices (kind);

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id
  ON invoices (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id
  ON invoices (subscription_id)
  WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_category_hint
  ON invoices (category_hint)
  WHERE category_hint IS NOT NULL;
