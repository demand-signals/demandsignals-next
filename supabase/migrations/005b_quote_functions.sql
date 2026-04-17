-- ============================================================
-- Quote Estimator — Part 2 of 3: Functions and Triggers
-- Run this file AFTER 005a_quote_tables.sql.
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- FUNCTION: set_updated_at (trigger helper)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $func_set_updated_at$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func_set_updated_at$;

-- ============================================================
-- TRIGGERS
-- ============================================================
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

-- ============================================================
-- FUNCTION: generate_invoice_number
-- Produces 'DSIG-YYYY-NNNN' from invoice_number_seq.
-- ============================================================
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

-- ============================================================
-- FUNCTION: recompute_session_state
-- Rebuilds quote_sessions.selected_items from the event stream.
-- ============================================================
CREATE OR REPLACE FUNCTION recompute_session_state(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $func_recompute$
DECLARE
  v_items jsonb := '[]'::jsonb;
  v_event record;
  v_item_id text;
  v_quantity integer;
  v_existing_idx integer;
BEGIN
  FOR v_event IN
    SELECT event_type, event_data, created_at
    FROM quote_events
    WHERE session_id = p_session_id
      AND event_type IN ('item_added','item_removed','item_adjusted')
    ORDER BY created_at ASC
  LOOP
    v_item_id := v_event.event_data->>'item_id';
    IF v_item_id IS NULL THEN CONTINUE; END IF;

    v_existing_idx := NULL;
    SELECT ordinality - 1 INTO v_existing_idx
    FROM jsonb_array_elements(v_items) WITH ORDINALITY
    WHERE value->>'id' = v_item_id
    LIMIT 1;

    IF v_event.event_type = 'item_added' THEN
      v_quantity := COALESCE((v_event.event_data->>'quantity')::integer, 1);
      IF v_existing_idx IS NULL THEN
        v_items := v_items || jsonb_build_array(jsonb_build_object(
          'id', v_item_id,
          'quantity', v_quantity,
          'narrowing_answers', COALESCE(v_event.event_data->'narrowing_answers', '{}'::jsonb),
          'added_at', v_event.created_at
        ));
      ELSE
        v_items := jsonb_set(v_items, ARRAY[v_existing_idx::text, 'quantity'], to_jsonb(v_quantity));
      END IF;

    ELSIF v_event.event_type = 'item_removed' THEN
      IF v_existing_idx IS NOT NULL THEN
        v_items := v_items - v_existing_idx;
      END IF;

    ELSIF v_event.event_type = 'item_adjusted' THEN
      IF v_existing_idx IS NOT NULL THEN
        IF v_event.event_data ? 'quantity' THEN
          v_items := jsonb_set(v_items, ARRAY[v_existing_idx::text, 'quantity'],
                               to_jsonb((v_event.event_data->>'quantity')::integer));
        END IF;
        IF v_event.event_data ? 'narrowing_answers' THEN
          v_items := jsonb_set(v_items, ARRAY[v_existing_idx::text, 'narrowing_answers'],
                               v_event.event_data->'narrowing_answers');
        END IF;
      END IF;
    END IF;
  END LOOP;

  UPDATE quote_sessions
  SET selected_items = v_items,
      updated_at = now()
  WHERE id = p_session_id;

  RETURN v_items;
END;
$func_recompute$;

-- ============================================================
-- FUNCTION: expire_stale_sessions
-- Cron-driven lifecycle transitions.
-- ============================================================
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
