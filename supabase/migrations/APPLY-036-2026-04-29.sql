-- ── APPLY-036-2026-04-29: SOW + invoice document-level discounts ──
--
-- Paste this WHOLE file into the Supabase SQL Editor and Run.
-- Web editor does NOT support psql meta-commands (\echo, \i) — so
-- the migration body is inlined here instead of \i-included.
--
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS, CHECK constraints
-- only add when missing).

-- ── 036_sow_invoice_discounts.sql (inlined) ───────────────────────
-- Document-level discounts on SOWs and invoices.
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

-- Verify (run separately to inspect):
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'sow_documents' AND column_name LIKE 'discount_%';
--   -- expect 4 rows
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'invoices' AND column_name LIKE 'discount_%';
--   -- expect 5 rows (4 new + the existing discount_cents)
