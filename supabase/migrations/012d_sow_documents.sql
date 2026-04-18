-- 012d: Statement of Work documents — proposal/scope artifacts.
-- Separate from invoices because SOWs are pre-contract; invoices are post.

CREATE SEQUENCE IF NOT EXISTS sow_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_sow_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_gen_sow$
DECLARE
  next_num bigint;
  year_part text;
BEGIN
  next_num := nextval('sow_number_seq');
  year_part := to_char(now(), 'YYYY');
  RETURN 'SOW-' || year_part || '-' || lpad(next_num::text, 4, '0');
END;
$func_gen_sow$;

REVOKE EXECUTE ON FUNCTION generate_sow_number FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_sow_number TO service_role;

CREATE TABLE IF NOT EXISTS sow_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_number text NOT NULL UNIQUE,
  public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  quote_session_id uuid REFERENCES quote_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','accepted','declined','void')),
  title text NOT NULL,
  scope_summary text,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_terms text,
  guarantees text,
  notes text,
  pdf_storage_path text,
  pdf_rendered_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_signature text,
  accepted_ip text,
  declined_at timestamptz,
  decline_reason text,
  voided_at timestamptz,
  void_reason text,
  deposit_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sow_documents_public_uuid
  ON sow_documents (public_uuid);
CREATE INDEX IF NOT EXISTS idx_sow_documents_prospect
  ON sow_documents (prospect_id);
CREATE INDEX IF NOT EXISTS idx_sow_documents_status
  ON sow_documents (status);

ALTER TABLE sow_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full sow_documents" ON sow_documents;
CREATE POLICY "Admins full sow_documents" ON sow_documents
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON sow_documents FROM anon;
REVOKE ALL ON SEQUENCE sow_number_seq FROM anon;
