-- 011d: Payment method, category hints for future accounting, delivery
-- channel tracking, public view counter.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_method text,
  ADD COLUMN IF NOT EXISTS paid_note text,
  ADD COLUMN IF NOT EXISTS category_hint text,
  ADD COLUMN IF NOT EXISTS sent_via_channel text,
  ADD COLUMN IF NOT EXISTS sent_via_email_to text,
  ADD COLUMN IF NOT EXISTS public_viewed_count integer NOT NULL DEFAULT 0;
