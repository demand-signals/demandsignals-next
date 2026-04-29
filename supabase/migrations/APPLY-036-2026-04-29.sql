-- ── APPLY-036-2026-04-29: SOW + invoice document-level discounts ──
-- Run in Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).

\echo 'Running 036_sow_invoice_discounts...'
\i 036_sow_invoice_discounts.sql

\echo 'Done.'
