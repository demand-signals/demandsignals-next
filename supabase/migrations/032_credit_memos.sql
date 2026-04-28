-- 032: Credit memos.
-- A credit memo is an accounting artifact issued against an invoice. Mirrors
-- receipts (immutable audit) but flows the OTHER direction — money/credit out
-- to the client, or an accounting write-off.
--
-- Four kinds:
--   refund     — money refunded (cash via Stripe / check / wire / etc)
--   goodwill   — credit applied to future invoice, no money moves
--   dispute    — chargeback received from card processor
--   write_off  — uncollectable balance, accounting cleanup
--
-- Refunds via Stripe carry the refund's `re_…` id in stripe_refund_id +
-- the original payment_intent in payment_reference for audit trail.
--
-- Multiple credit memos per invoice are allowed (partial refunds across
-- multiple events). getInvoicePaymentSummary sums credit_memos.amount_cents
-- by currency and subtracts from paid_total to compute outstanding.

-- Widen the document_numbers.doc_type CHECK constraint to include CRM
-- so allocate_document_number() can mint CRM-CLIENT-MMDDYY{A} suffixes.
ALTER TABLE document_numbers
  DROP CONSTRAINT IF EXISTS document_numbers_doc_type_check;
ALTER TABLE document_numbers
  ADD CONSTRAINT document_numbers_doc_type_check
  CHECK (doc_type IN ('EST','SOW','INV','RCT','CRM'));

CREATE TABLE IF NOT EXISTS credit_memos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_memo_number  text NOT NULL UNIQUE,  -- CRM-HANG-042826A
  invoice_id          uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  prospect_id         uuid NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  amount_cents        integer NOT NULL CHECK (amount_cents > 0),
  currency            text NOT NULL DEFAULT 'USD',
  -- What kind of credit this is.
  kind                text NOT NULL CHECK (kind IN ('refund','goodwill','dispute','write_off')),
  -- Reason summary (short, displayed on PDF / email).
  reason              text NOT NULL,
  -- Free-form admin notes.
  notes               text,
  -- How the credit was returned to the client (only meaningful for kind='refund').
  -- For goodwill / write_off this stays NULL.
  payment_method      text CHECK (
    payment_method IS NULL
    OR payment_method IN ('stripe_refund','check','wire','cash','other','tik','zero_balance')
  ),
  -- External reference (Stripe refund id, check #, wire trace).
  payment_reference   text,
  -- Stripe-specific: re_… id of the actual Stripe Refund object.
  stripe_refund_id    text,
  -- When the credit was issued (admin-editable; defaults to now()).
  issued_at           timestamptz NOT NULL DEFAULT now(),
  -- When (and by whom) the row was inserted into the platform.
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_memos_invoice_id  ON credit_memos (invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_memos_prospect_id ON credit_memos (prospect_id);
CREATE INDEX IF NOT EXISTS idx_credit_memos_issued_at   ON credit_memos (issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_memos_kind        ON credit_memos (kind);

-- Lookups by Stripe refund id (webhook handler will reconcile back to our row).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_memos_stripe_refund_id
  ON credit_memos (stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

-- email_engagement gets a per-event credit_memo_id link so engagement events
-- (sent / opened / clicked) for credit-memo emails can be filtered alongside
-- invoice / SOW / receipt engagement.
ALTER TABLE email_engagement
  ADD COLUMN IF NOT EXISTS credit_memo_id UUID REFERENCES credit_memos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_engagement_credit_memo
  ON email_engagement (credit_memo_id, occurred_at DESC)
  WHERE credit_memo_id IS NOT NULL;

-- RLS: service_role only (admin endpoints).
ALTER TABLE credit_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_memos_service_all ON credit_memos;
CREATE POLICY credit_memos_service_all
  ON credit_memos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
