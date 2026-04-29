-- 036: Document-level discounts on SOWs and invoices.
--
-- Different from the per-line-item discount_pct that already exists on
-- invoice line items. This is a SOW/invoice-WIDE discount that renders
-- as its own row in the pricing block (next to Trade-in-Kind).
--
-- Conventions per Hunter (2026-04-29):
--   - Discounts are on one-time totals only. Never on recurring/monthly.
--   - SOW discount auto-inherits to the deposit invoice on SOW accept,
--     and to any invoice created from a SOW conversion. Inheritance is
--     a copy at creation time — admin can edit per-invoice afterwards.
--   - Discount + Trade-in-Kind can coexist on the same document.
--     Order: subtotal → minus discount → minus TIK → cash total
--     (the rendering layer enforces final >= 0).
--
-- Storage:
--   discount_kind        — 'percent' | 'amount' | NULL (null = no discount)
--   discount_value_bps   — basis points when kind='percent' (5000 = 50%)
--                          0..10000 enforced via check
--   discount_amount_cents — flat amount when kind='amount'
--   discount_description — human-readable label ("Loyalty discount", etc.)
--
-- Basis points (1 bp = 0.01%) are stored as integers to avoid float
-- drift on percentage math. UI converts to/from a 0-100 input.

ALTER TABLE sow_documents
  ADD COLUMN IF NOT EXISTS discount_kind text
    CHECK (discount_kind IS NULL OR discount_kind IN ('percent', 'amount')),
  ADD COLUMN IF NOT EXISTS discount_value_bps integer NOT NULL DEFAULT 0
    CHECK (discount_value_bps >= 0 AND discount_value_bps <= 10000),
  ADD COLUMN IF NOT EXISTS discount_amount_cents integer NOT NULL DEFAULT 0
    CHECK (discount_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS discount_description text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS discount_kind text
    CHECK (discount_kind IS NULL OR discount_kind IN ('percent', 'amount')),
  ADD COLUMN IF NOT EXISTS discount_value_bps integer NOT NULL DEFAULT 0
    CHECK (discount_value_bps >= 0 AND discount_value_bps <= 10000),
  ADD COLUMN IF NOT EXISTS discount_amount_cents integer NOT NULL DEFAULT 0
    CHECK (discount_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS discount_description text;

COMMENT ON COLUMN sow_documents.discount_kind IS
  'Document-level discount kind: percent | amount | null. Different from per-line-item discount_pct on invoices.';
COMMENT ON COLUMN sow_documents.discount_value_bps IS
  'Basis points (5000 = 50%). Used when discount_kind = percent.';
COMMENT ON COLUMN sow_documents.discount_amount_cents IS
  'Flat amount in cents. Used when discount_kind = amount.';

COMMENT ON COLUMN invoices.discount_kind IS
  'Document-level discount kind: percent | amount | null. Inherits from parent SOW at creation time, then editable per-invoice.';
