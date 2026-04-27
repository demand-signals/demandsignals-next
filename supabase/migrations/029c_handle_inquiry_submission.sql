-- ── 029c: handle_inquiry_submission RPC ───────────────────────────
-- Atomic prospect resolution + inquiry insert + timestamp bump.
-- Resolution priority: cookie pid > email match > auto-create.
-- Returns the inserted inquiry_id, prospect_id, and attribution_source.
--
-- SECURITY DEFINER + service_role-only EXECUTE. Callers (route handlers
-- using supabaseAdmin client) pass already-validated inputs; the RPC
-- does no further validation beyond NOT NULL guards.

CREATE OR REPLACE FUNCTION handle_inquiry_submission(
  p_cookie_pid          uuid,
  p_source              text,            -- 'quick_form' | 'contact_form' | 'portal_reply'
  p_name                text,
  p_email               text,
  p_phone               text,
  p_business            text,
  p_service_interest    text,
  p_message             text,
  p_page_url            text,
  p_referer             text,
  p_ip                  inet,
  p_user_agent          text
)
RETURNS TABLE (
  inquiry_id            uuid,
  prospect_id           uuid,
  attribution_source    text,
  was_created           boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_prospect_id         uuid;
  v_attribution_source  text;
  v_was_created         boolean := false;
  v_inquiry_id          uuid;
  v_email_lower         text := lower(p_email);
  v_business_name       text;
  v_source_short        text;
BEGIN
  -- Step (a): cookie pid
  IF p_cookie_pid IS NOT NULL THEN
    SELECT id INTO v_prospect_id FROM prospects WHERE id = p_cookie_pid;
    IF FOUND THEN
      v_attribution_source := 'cookie';
    END IF;
  END IF;

  -- Step (b): email match
  IF v_prospect_id IS NULL THEN
    SELECT id INTO v_prospect_id FROM prospects
      WHERE lower(owner_email) = v_email_lower
         OR lower(business_email) = v_email_lower
      ORDER BY created_at ASC LIMIT 1;
    IF FOUND THEN
      v_attribution_source := 'email_match';
    END IF;
  END IF;

  -- Step (c): auto-create
  IF v_prospect_id IS NULL THEN
    v_attribution_source := 'new';
    v_was_created := true;
    v_business_name := COALESCE(NULLIF(trim(p_business),''), p_name);
    v_source_short := CASE p_source
      WHEN 'quick_form' THEN 'quick'
      WHEN 'contact_form' THEN 'contact'
      ELSE 'portal'
    END;

    BEGIN
      INSERT INTO prospects (
        business_name, owner_name, owner_email, owner_phone,
        source, stage, first_inquiry_at, last_inquiry_at, last_activity_at
      ) VALUES (
        v_business_name, p_name, p_email, p_phone,
        'inquiry_' || v_source_short, 'unqualified',
        now(), now(), now()
      ) RETURNING id INTO v_prospect_id;
    EXCEPTION WHEN unique_violation THEN
      -- Retry with disambiguated business_name
      BEGIN
        INSERT INTO prospects (
          business_name, owner_name, owner_email, owner_phone,
          source, stage, first_inquiry_at, last_inquiry_at, last_activity_at
        ) VALUES (
          p_name || ' (' || p_email || ')', p_name, p_email, p_phone,
          'inquiry_' || v_source_short, 'unqualified',
          now(), now(), now()
        ) RETURNING id INTO v_prospect_id;
      EXCEPTION WHEN unique_violation THEN
        -- Final fallback: attach to existing colliding row.
        SELECT id INTO v_prospect_id FROM prospects
          WHERE business_name = v_business_name LIMIT 1;
        v_was_created := false;
        v_attribution_source := 'new';  -- still "new" from caller's POV
      END;
    END;
  ELSE
    -- Existing prospect: bump timestamps.
    UPDATE prospects
      SET last_inquiry_at = now(),
          last_activity_at = now(),
          first_inquiry_at = COALESCE(first_inquiry_at, now())
      WHERE id = v_prospect_id;
  END IF;

  -- Insert inquiry
  INSERT INTO prospect_inquiries (
    prospect_id, source, name, email, phone, business, service_interest,
    message, page_url, referer, attribution_source, ip, user_agent
  ) VALUES (
    v_prospect_id, p_source, p_name, p_email, p_phone, p_business,
    p_service_interest, p_message, p_page_url, p_referer,
    v_attribution_source, p_ip, p_user_agent
  ) RETURNING id INTO v_inquiry_id;

  RETURN QUERY SELECT v_inquiry_id, v_prospect_id, v_attribution_source, v_was_created;
END
$func$;

REVOKE ALL ON FUNCTION handle_inquiry_submission(
  uuid, text, text, text, text, text, text, text, text, text, inet, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION handle_inquiry_submission(
  uuid, text, text, text, text, text, text, text, text, text, inet, text
) TO service_role;
