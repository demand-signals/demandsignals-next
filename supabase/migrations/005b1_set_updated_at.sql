CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $func_set_updated_at$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func_set_updated_at$;

DROP TRIGGER IF EXISTS trg_quote_sessions_updated_at ON quote_sessions;
CREATE TRIGGER trg_quote_sessions_updated_at
  BEFORE UPDATE ON quote_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quote_config_updated_at ON quote_config;
CREATE TRIGGER trg_quote_config_updated_at
  BEFORE UPDATE ON quote_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
