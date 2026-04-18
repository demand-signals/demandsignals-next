-- 013a: Kill-switch config rows for invoicing automation + Stripe + delivery.
-- Use ON CONFLICT DO NOTHING so re-running doesn't overwrite admin-set values.

INSERT INTO quote_config (key, value) VALUES
  ('automated_invoicing_enabled', 'true'),
  ('stripe_enabled', 'false'),
  ('sms_delivery_enabled', 'false'),
  ('email_delivery_enabled', 'false'),
  ('subscription_cycle_cron_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
