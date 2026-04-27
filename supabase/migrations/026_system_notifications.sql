-- ── 026_system_notifications.sql ────────────────────────────────────
-- System-wide notification log. Surfaces failures (and notable events)
-- from any subsystem to a future Command Center "Messages" screen.
-- See docs/superpowers/specs/2026-04-27-resend-email-swap-design.md §5.1.

CREATE TABLE IF NOT EXISTS system_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity         TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  source           TEXT NOT NULL,                     -- 'email','stripe','cron','auth','manual',...
  title            TEXT NOT NULL,                     -- one-line summary
  body             TEXT,                              -- detail/stack trace
  context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emailed_at       TIMESTAMPTZ,                       -- when alert email was sent (NULL if blocked or failed)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_unread
  ON system_notifications (severity, created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_notifications_source
  ON system_notifications (source, created_at DESC);

-- Used by alert-email throttle logic in src/lib/system-alerts.ts.
CREATE INDEX IF NOT EXISTS idx_system_notifications_throttle
  ON system_notifications (source, (context->>'error_code'), emailed_at)
  WHERE emailed_at IS NOT NULL;

ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
-- service_role only; admin RLS policy added when Command Center UI lands.
