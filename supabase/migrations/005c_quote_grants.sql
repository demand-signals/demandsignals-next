-- Quote Estimator Part 3: Lock down SECURITY DEFINER functions.
-- Run after 005b* files. Idempotent.

-- Revoke from every role anon or authenticator can inherit from.
REVOKE EXECUTE ON FUNCTION recompute_session_state(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION recompute_session_state(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION recompute_session_state(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION expire_stale_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION expire_stale_sessions() FROM anon;
REVOKE EXECUTE ON FUNCTION expire_stale_sessions() FROM authenticated;

REVOKE EXECUTE ON FUNCTION generate_invoice_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_invoice_number() FROM anon;
REVOKE EXECUTE ON FUNCTION generate_invoice_number() FROM authenticated;

-- Explicitly grant only to service_role (the Supabase role used by service-key clients).
GRANT EXECUTE ON FUNCTION recompute_session_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION expire_stale_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO service_role;

-- Reset invoice sequence since the RLS test invoked generate_invoice_number() once
-- before lockdown. Safe — no real invoice exists yet.
SELECT setval('invoice_number_seq', 1, false);
