CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_gen_invoice$
DECLARE
  next_num bigint;
  year_part text;
BEGIN
  next_num := nextval('invoice_number_seq');
  year_part := to_char(now(), 'YYYY');
  RETURN 'DSIG-' || year_part || '-' || lpad(next_num::text, 4, '0');
END;
$func_gen_invoice$;
