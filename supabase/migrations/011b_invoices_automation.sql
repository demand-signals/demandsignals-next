-- 011b: Automation tier flags on invoices.
-- Tier 1 = manual; Tier 2 = auto-draft + admin review; Tier 3 = auto-send.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_trigger text,
  ADD COLUMN IF NOT EXISTS auto_sent boolean NOT NULL DEFAULT false;
