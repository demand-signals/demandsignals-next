-- 011c: PDF storage tracking on invoices.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_rendered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_version integer NOT NULL DEFAULT 1;
