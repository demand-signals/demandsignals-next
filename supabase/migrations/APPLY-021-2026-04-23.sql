-- 021a: EST document number on quote_sessions.
-- Lazy allocation: set when session first gets linked to a prospect (and
-- therefore has a client_code available). Sessions before prospect-link
-- stay null — they're anonymous, no client context.

ALTER TABLE quote_sessions
  ADD COLUMN IF NOT EXISTS doc_number text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quote_sessions_doc_number
  ON quote_sessions (doc_number)
  WHERE doc_number IS NOT NULL;
