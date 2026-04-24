-- 019a: Client code + platform-wide document numbering (TYPE-CLIENT-MMDDYY{SUFFIX}).

-- Prospect client code. 4 letters (uppercased). Unique when set.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS client_code text;

-- Partial unique index — allows many NULL rows, uniqueness only on set values.
CREATE UNIQUE INDEX IF NOT EXISTS ux_prospects_client_code
  ON prospects (client_code)
  WHERE client_code IS NOT NULL;

-- Audit log of every document number issued. Single source of truth for
-- per-(type, client_code, date) sequential suffix allocation.
CREATE TABLE IF NOT EXISTS document_numbers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number   text NOT NULL UNIQUE,  -- e.g. INV-HANG-042326A
  doc_type     text NOT NULL CHECK (doc_type IN ('EST','SOW','INV','RCT')),
  client_code  text NOT NULL,
  date_key     text NOT NULL,  -- MMDDYY
  suffix       text NOT NULL,  -- A, B, ..., Z, AA, AB, ...
  ref_table    text NOT NULL,  -- 'invoices', 'sow_documents', 'receipts', 'quote_sessions'
  ref_id       uuid,           -- row id in that table
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_numbers_lookup
  ON document_numbers (doc_type, client_code, date_key);

CREATE INDEX IF NOT EXISTS idx_document_numbers_ref
  ON document_numbers (ref_table, ref_id);

-- RLS: admin can read, nothing else.
ALTER TABLE document_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read document_numbers" ON document_numbers;
CREATE POLICY "Admins read document_numbers" ON document_numbers
  FOR SELECT USING (is_admin());

-- Writes only via service role (server-side allocation).
REVOKE ALL ON document_numbers FROM anon, authenticated;

-- RPC to allocate next number atomically. Takes a lock on the (doc_type,
-- client_code, date_key) triple by SELECT FOR UPDATE on any existing row,
-- computes next suffix, inserts, returns the full doc_number.
CREATE OR REPLACE FUNCTION allocate_document_number(
  p_doc_type     text,
  p_client_code  text,
  p_ref_table    text,
  p_ref_id       uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_date_key   text;
  v_last       text;
  v_next       text;
  v_doc_number text;
BEGIN
  IF p_doc_type NOT IN ('EST','SOW','INV','RCT') THEN
    RAISE EXCEPTION 'Invalid doc_type: %', p_doc_type;
  END IF;
  IF p_client_code IS NULL OR length(p_client_code) = 0 THEN
    RAISE EXCEPTION 'client_code required';
  END IF;

  v_date_key := to_char(now() AT TIME ZONE 'America/Los_Angeles', 'MMDDYY');

  -- Lock the set of existing suffixes for this triple.
  SELECT suffix INTO v_last
  FROM document_numbers
  WHERE doc_type = p_doc_type
    AND client_code = p_client_code
    AND date_key = v_date_key
  ORDER BY
    length(suffix) DESC,
    suffix DESC
  LIMIT 1
  FOR UPDATE;

  -- Compute next suffix: A, B, ..., Z, AA, AB, ..., ZZ, AAA, ...
  -- Treat as base-26 with A=1.
  IF v_last IS NULL THEN
    v_next := 'A';
  ELSE
    -- Increment v_last as base-26
    DECLARE
      i int;
      carry int := 1;
      chars int[];
      c int;
    BEGIN
      chars := ARRAY[]::int[];
      FOR i IN REVERSE length(v_last)..1 LOOP
        chars := array_append(chars, ascii(substr(v_last, i, 1)) - ascii('A') + 1);
      END LOOP;
      FOR i IN 1..array_length(chars, 1) LOOP
        IF carry = 0 THEN EXIT; END IF;
        c := chars[i] + carry;
        IF c > 26 THEN
          chars[i] := c - 26;
          carry := 1;
        ELSE
          chars[i] := c;
          carry := 0;
        END IF;
      END LOOP;
      IF carry = 1 THEN
        chars := array_append(chars, 1);
      END IF;
      v_next := '';
      FOR i IN REVERSE array_length(chars, 1)..1 LOOP
        v_next := v_next || chr(chars[i] + ascii('A') - 1);
      END LOOP;
    END;
  END IF;

  v_doc_number := p_doc_type || '-' || upper(p_client_code) || '-' || v_date_key || v_next;

  INSERT INTO document_numbers (doc_number, doc_type, client_code, date_key, suffix, ref_table, ref_id)
  VALUES (v_doc_number, p_doc_type, upper(p_client_code), v_date_key, v_next, p_ref_table, p_ref_id);

  RETURN v_doc_number;
END;
$func$;

REVOKE EXECUTE ON FUNCTION allocate_document_number FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION allocate_document_number TO service_role;
