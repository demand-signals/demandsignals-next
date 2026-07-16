-- ── 058_msa_number_random.sql ────────────────────────────────────────────
-- Replace the sequential MSA number (MSA-YYYY-0001, 0002, …) with a random
-- 5-digit suffix (MSA-YYYY-48213) so the document number does not disclose how
-- many MSAs have been issued. Collision-checked against existing msa_documents
-- rows (msa_number is UNIQUE); loops until it finds a free number.
--
-- The old msa_number_seq is left in place (harmless) but no longer used.

CREATE OR REPLACE FUNCTION generate_msa_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_gen_msa$
DECLARE
  year_part text := to_char(now(), 'YYYY');
  candidate text;
  attempts  int := 0;
BEGIN
  LOOP
    -- 5-digit random in [10000, 99999] — always 5 digits, no leading-zero ambiguity
    candidate := 'MSA-' || year_part || '-' ||
                 lpad((10000 + floor(random() * 90000)::int)::text, 5, '0');

    -- Ensure uniqueness against already-issued MSAs
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM msa_documents WHERE msa_number = candidate
    );

    attempts := attempts + 1;
    IF attempts > 50 THEN
      -- Astronomically unlikely with a 90k space at expected volumes; fail loud
      -- rather than spin forever if the space is somehow exhausted.
      RAISE EXCEPTION 'generate_msa_number: could not find a free number after % attempts', attempts;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$func_gen_msa$;

REVOKE EXECUTE ON FUNCTION generate_msa_number FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_msa_number TO service_role;

-- ── MSA open-tracking columns ────────────────────────────────────────────
-- Support "text me every time the client opens the MSA" (throttled). Mirrors
-- the invoices.view_sms_sent_at pattern: stores the LAST time an open-SMS was
-- sent so the app can throttle to one text per window per document.
ALTER TABLE msa_documents
  ADD COLUMN IF NOT EXISTS view_sms_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_viewed_count integer NOT NULL DEFAULT 0;
