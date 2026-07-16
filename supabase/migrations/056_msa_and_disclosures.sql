-- 056: Master Service Agreement documents + versioned disclosure registry.
-- The MSA is the relationship contract (signed once per client); it rides the
-- same render→R2→send rails as sow_documents/invoices. Disclosures are standing,
-- immutable, versioned public artifacts the MSA hyperlinks to.
--
-- Mirrors 012d_sow_documents.sql structure. Public disclosures live in the
-- public R2 bucket (assets.demandsignals.co); rendered per-client MSAs live in
-- the private bucket (signed URLs), exactly like SOWs.

-- ── MSA document numbering (MSA-YYYY-NNNN) ───────────────────────────────
CREATE SEQUENCE IF NOT EXISTS msa_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_msa_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_gen_msa$
DECLARE
  next_num bigint;
  year_part text;
BEGIN
  next_num := nextval('msa_number_seq');
  year_part := to_char(now(), 'YYYY');
  RETURN 'MSA-' || year_part || '-' || lpad(next_num::text, 4, '0');
END;
$func_gen_msa$;

REVOKE EXECUTE ON FUNCTION generate_msa_number FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_msa_number TO service_role;

-- ── Disclosure registry — immutable, versioned, public ───────────────────
-- Each row is one published version of a disclosure. Once published its
-- public_url + sha256 NEVER change; a new quarter is a NEW row with a new code.
-- This is what makes the MSA's incorporation-by-reference durable: a client who
-- e-initialed DSIG.STSD.Q3Y26 can always retrieve the exact bytes they agreed to.
CREATE TABLE IF NOT EXISTS disclosure_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- doc kind: STSD | SRPD | MCD | SRRD
  kind text NOT NULL CHECK (kind IN ('STSD','SRPD','MCD','SRRD')),
  -- full code, e.g. DSIG.STSD.Q3Y26.v1a — globally unique, immutable
  code text NOT NULL UNIQUE,
  -- human title, e.g. "Standard Terms of Service Disclosure"
  title text NOT NULL,
  -- quarter tag, e.g. Q3Y26
  version text NOT NULL,
  -- public R2 key + resolved public URL the MSA links to
  storage_key text NOT NULL,
  public_url text NOT NULL,
  -- sha256 of the published PDF bytes — recorded on client acknowledgment
  sha256 text NOT NULL,
  -- whether this is the current version clients should be sent for its kind
  is_current boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disclosure_versions_kind_current
  ON disclosure_versions (kind, is_current);

-- ── MSA documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS msa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  msa_number text NOT NULL UNIQUE,
  public_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','executed','void')),
  -- inline-customization fields injected at render (per-client)
  title text NOT NULL DEFAULT 'Master Service Agreement',
  client_legal_name text,
  client_code text,
  client_entity_type text,           -- e.g. "a Michigan limited liability company"
  effective_date date,
  -- which disclosure versions are incorporated (array of disclosure_versions.code)
  incorporated_disclosures jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- DSIG signatory is constant but stored for render + audit
  dsig_signatory_name text NOT NULL DEFAULT 'Hunter Long',
  dsig_signatory_title text NOT NULL DEFAULT 'Managing Director',
  dsig_signatory_email text NOT NULL DEFAULT 'DemandSignals@gmail.com',
  dsig_signatory_cell text NOT NULL DEFAULT '916-542-2423',
  pdf_storage_path text,             -- private R2 key
  pdf_rendered_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  -- execution capture (client side)
  executed_at timestamptz,
  executed_signature text,           -- typed full name
  executed_ip text,
  -- per-disclosure e-initials: [{code, initials, sha256, at, ip}, ...]
  disclosure_initials jsonb NOT NULL DEFAULT '[]'::jsonb,
  voided_at timestamptz,
  void_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_msa_documents_public_uuid
  ON msa_documents (public_uuid);
CREATE INDEX IF NOT EXISTS idx_msa_documents_prospect
  ON msa_documents (prospect_id);
CREATE INDEX IF NOT EXISTS idx_msa_documents_status
  ON msa_documents (status);

-- ── Client-level MSA flags (any flow can check "does this client have an MSA?") ──
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS has_executed_msa boolean NOT NULL DEFAULT false;
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS msa_executed_at timestamptz;
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS executed_msa_id uuid REFERENCES msa_documents(id) ON DELETE SET NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE msa_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full msa_documents" ON msa_documents;
CREATE POLICY "Admins full msa_documents" ON msa_documents
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
REVOKE ALL ON msa_documents FROM anon;

ALTER TABLE disclosure_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full disclosure_versions" ON disclosure_versions;
CREATE POLICY "Admins full disclosure_versions" ON disclosure_versions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
-- disclosure_versions are public-facing metadata (the PDFs themselves are on
-- the public bucket); allow anon SELECT of current versions for the public
-- disclosure index page.
DROP POLICY IF EXISTS "Anon read current disclosures" ON disclosure_versions;
CREATE POLICY "Anon read current disclosures" ON disclosure_versions
  FOR SELECT USING (is_current = true);

REVOKE ALL ON SEQUENCE msa_number_seq FROM anon;
