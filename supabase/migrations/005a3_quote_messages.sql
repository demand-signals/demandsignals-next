CREATE TABLE IF NOT EXISTS quote_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quote_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  channel text NOT NULL DEFAULT 'web',
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_model_used text,
  tokens_input integer,
  tokens_output integer,
  cost_cents integer,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quote_messages DROP CONSTRAINT IF EXISTS quote_messages_role_check;
ALTER TABLE quote_messages ADD CONSTRAINT quote_messages_role_check CHECK (role IN ('ai','user','human_agent','system'));

ALTER TABLE quote_messages DROP CONSTRAINT IF EXISTS quote_messages_channel_check;
ALTER TABLE quote_messages ADD CONSTRAINT quote_messages_channel_check CHECK (channel IN ('web','sms','email'));

CREATE INDEX IF NOT EXISTS idx_quote_messages_session_id ON quote_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_messages_flagged ON quote_messages (flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_quote_messages_agent ON quote_messages (agent_user_id) WHERE agent_user_id IS NOT NULL;

ALTER TABLE quote_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quote_messages" ON quote_messages;
DROP POLICY IF EXISTS "Admins can insert quote_messages" ON quote_messages;
DROP POLICY IF EXISTS "Admins can update quote_messages" ON quote_messages;

CREATE POLICY "Admins can read quote_messages" ON quote_messages FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert quote_messages" ON quote_messages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update quote_messages" ON quote_messages FOR UPDATE USING (is_admin());

REVOKE ALL ON quote_messages FROM anon;
