-- APPLY-040-2026-05-01.sql
-- Inlined per the web-editor convention (CLAUDE.md §12). Run this entire
-- file in the Supabase SQL Editor in one shot.
--
-- Adds invoices.payment_terms text column. Additive only.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_terms text;

COMMENT ON COLUMN invoices.payment_terms IS
  'Free-text payment terms shown on the invoice. Auto-generated from invoice shape (total, due date, TIK, discount, late fee) at save time when admin leaves it blank; otherwise admin-authored.';

-- ── Verify ─────────────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'payment_terms';
-- Expect 1 row: payment_terms | text | YES
