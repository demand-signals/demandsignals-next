CREATE OR REPLACE FUNCTION expire_stale_sessions()
RETURNS TABLE(abandoned_count integer, purged_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_expire$
DECLARE
  v_abandoned integer;
  v_purged integer;
BEGIN
  WITH updated AS (
    UPDATE quote_sessions
    SET status = 'abandoned'
    WHERE status = 'active'
      AND updated_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_abandoned FROM updated;

  WITH deleted AS (
    DELETE FROM quote_sessions
    WHERE status = 'abandoned'
      AND phone_verified = false
      AND prospect_id IS NULL
      AND updated_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_purged FROM deleted;

  RETURN QUERY SELECT v_abandoned, v_purged;
END;
$func_expire$;
