-- 011f: Stripe integration columns on invoices.
--
-- stripe_invoice_id: Set ONLY for subscription cycle invoices (Stripe creates
--   those as part of subscription charges). Null for ad-hoc and quote-driven.
-- stripe_payment_link_id / _url: Cached on-demand Payment Link; generated
--   when client clicks Pay Now.
-- subscription_id: FK added in 012c after subscriptions table exists.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url text,
  ADD COLUMN IF NOT EXISTS subscription_id uuid;
