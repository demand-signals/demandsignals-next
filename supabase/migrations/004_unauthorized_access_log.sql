-- Unauthorized access attempt logging
-- Captures full fingerprint of anyone who authenticates via Google but isn't in admin_users

CREATE TABLE IF NOT EXISTS unauthorized_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude TEXT,
  longitude TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by email or IP
CREATE INDEX idx_unauthorized_email ON unauthorized_access_log(email);
CREATE INDEX idx_unauthorized_ip ON unauthorized_access_log(ip_address);
CREATE INDEX idx_unauthorized_at ON unauthorized_access_log(attempted_at DESC);

-- RLS: only admins can read the log
ALTER TABLE unauthorized_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view unauthorized access logs"
ON unauthorized_access_log FOR SELECT
USING (is_admin());

-- INSERT is done via service role key (bypasses RLS), so no INSERT policy needed
