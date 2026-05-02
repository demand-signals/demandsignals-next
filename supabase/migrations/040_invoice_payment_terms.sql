-- ── 040_invoice_payment_terms.sql ──────────────────────────────────
-- Adds an editable payment_terms text column to invoices, mirroring
-- the field that has long existed on sow_documents.
--
-- Context (Hunter, 2026-05-01):
-- "There may be instances where we just want to send an invoice to a
--  client without the unnecessary process of creating SOW, projects,
--  etc. for things that do not need a project to ship."
--
-- The invoice is becoming a self-contained billing artifact, not just
-- a SOW byproduct. To do that it needs the same payment-terms surface
-- the SOW has — auto-generated from invoice shape (total, due date,
-- TIK, discount, late fee), then admin-editable.
--
-- We do NOT add a payment_terms_auto boolean. The admin's edit IS the
-- signal that they don't want it regenerated. UI honors empty-on-save
-- as "auto-generate from current invoice state at save time."
--
-- Migration is purely additive — no breaks to existing invoices, which
-- start out with NULL and render no payment-terms block until edited.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_terms text;

COMMENT ON COLUMN invoices.payment_terms IS
  'Free-text payment terms shown on the invoice. Auto-generated from invoice shape (total, due date, TIK, discount, late fee) at save time when admin leaves it blank; otherwise admin-authored.';
