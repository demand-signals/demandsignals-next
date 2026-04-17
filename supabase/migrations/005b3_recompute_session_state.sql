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
