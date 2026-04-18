-- 014a: DB-backed services catalog. Replaces the TS-only CATALOG in
-- src/lib/quote-pricing.ts as the source of truth. Admin can now CRUD via
-- /admin/services UI. Quote engine + invoicing + SOW all read from this table.
--
-- Rich fields preserved from the TS interface so nothing is lost. Complex
-- fields (narrowingFactors, suggestsWith, excludes) stored as JSONB for
-- flexibility.
--
-- Pricing philosophy: nothing is "free". Every service has a real price
-- (display_price_cents). "Free" becomes a 100% discount line on the invoice
-- for psychological anchoring. `included_with_paid_project` flags items that
-- are auto-added to paid-project deposit invoices at 100% discount (the
-- "New Client Appreciation" value stack).

CREATE TABLE IF NOT EXISTS services_catalog (
  id text PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  benefit text,
  ai_badge text,

  pricing_type text NOT NULL CHECK (pricing_type IN ('one-time','monthly','both')),
  base_range_low_cents integer NOT NULL DEFAULT 0,
  base_range_high_cents integer NOT NULL DEFAULT 0,
  monthly_range_low_cents integer,
  monthly_range_high_cents integer,
  display_price_cents integer NOT NULL DEFAULT 0,

  quantifiable boolean NOT NULL DEFAULT false,
  quantity_label text,
  per_unit_range_low_cents integer,
  per_unit_range_high_cents integer,
  default_quantity integer,
  min_quantity integer,
  max_quantity integer,

  narrowing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,

  timeline_weeks_low integer NOT NULL DEFAULT 0,
  timeline_weeks_high integer NOT NULL DEFAULT 0,
  parallel_group text,
  depends_on jsonb NOT NULL DEFAULT '[]'::jsonb,

  financeable boolean NOT NULL DEFAULT false,
  financing_term_months integer,

  suggests_with jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_base boolean NOT NULL DEFAULT false,
  excludes jsonb NOT NULL DEFAULT '[]'::jsonb,

  phase integer NOT NULL DEFAULT 1 CHECK (phase IN (1,2,3)),
  available_for_bid boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,

  -- Replaces the old is_free flag with explicit value-stack semantics:
  included_with_paid_project boolean NOT NULL DEFAULT false,

  -- Maintainability:
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_catalog_category ON services_catalog (category);
CREATE INDEX IF NOT EXISTS idx_services_catalog_active ON services_catalog (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_catalog_value_stack ON services_catalog (included_with_paid_project) WHERE included_with_paid_project = true;

ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read services_catalog" ON services_catalog;
DROP POLICY IF EXISTS "Admins write services_catalog" ON services_catalog;

-- Admin-only CRUD. Public reads go through server-side API routes using
-- service role (same pattern as quote_sessions).
CREATE POLICY "Admins read services_catalog" ON services_catalog FOR SELECT USING (is_admin());
CREATE POLICY "Admins write services_catalog" ON services_catalog FOR ALL USING (is_admin()) WITH CHECK (is_admin());

REVOKE ALL ON services_catalog FROM anon;

-- Trigger to keep updated_at fresh.
DROP TRIGGER IF EXISTS services_catalog_set_updated_at ON services_catalog;
CREATE TRIGGER services_catalog_set_updated_at
  BEFORE UPDATE ON services_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
