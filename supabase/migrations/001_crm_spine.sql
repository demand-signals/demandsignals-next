-- ============================================================
-- CRM Spine Schema — Agency OS
-- Migration: 001_crm_spine.sql
-- ============================================================

-- ============================================================
-- HELPER: is_admin() function
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$;

-- ============================================================
-- TABLE: admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update admin_users"
  ON admin_users FOR UPDATE
  USING (is_admin());

-- ============================================================
-- TABLE: prospects
-- ============================================================
CREATE TABLE IF NOT EXISTS prospects (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name         text NOT NULL,
  industry              text,
  address               text,
  city                  text,
  state                 text DEFAULT 'CA',
  zip                   text,
  owner_name            text,
  owner_email           text,
  owner_phone           text,
  business_phone        text,
  business_email        text,
  website_url           text,
  google_rating         numeric(3,1),
  google_review_count   integer,
  yelp_rating           numeric(3,1),
  yelp_review_count     integer,
  site_quality_score    integer,
  prospect_score        integer,
  score_factors         jsonb NOT NULL DEFAULT '{}',
  research_data         jsonb,
  research_completed_at timestamptz,
  auto_demo_eligible    boolean NOT NULL DEFAULT false,
  source                text NOT NULL DEFAULT 'manual',
  stage                 text NOT NULL DEFAULT 'researched',
  tags                  text[] NOT NULL DEFAULT '{}',
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  last_contacted_at     timestamptz,
  last_activity_at      timestamptz,
  UNIQUE (business_name, city)
);

CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects (stage);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects (industry);
CREATE INDEX IF NOT EXISTS idx_prospects_city ON prospects (city);
CREATE INDEX IF NOT EXISTS idx_prospects_prospect_score ON prospects (prospect_score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_auto_demo_eligible ON prospects (auto_demo_eligible) WHERE auto_demo_eligible = true;
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_last_activity_at ON prospects (last_activity_at DESC);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read prospects"
  ON prospects FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert prospects"
  ON prospects FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update prospects"
  ON prospects FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete prospects"
  ON prospects FOR DELETE
  USING (is_admin());

-- ============================================================
-- TABLE: demos
-- ============================================================
CREATE TABLE IF NOT EXISTS demos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id         uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  demo_url            text NOT NULL,
  platform            text NOT NULL DEFAULT 'verpex',
  status              text NOT NULL DEFAULT 'draft',
  version             integer NOT NULL DEFAULT 1,
  page_count          integer NOT NULL DEFAULT 0,
  generation_method   text NOT NULL DEFAULT 'manual',
  view_count          integer NOT NULL DEFAULT 0,
  last_viewed_at      timestamptz,
  unique_visitors     integer NOT NULL DEFAULT 0,
  screenshot_url      text,
  build_log           text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demos_prospect_id ON demos (prospect_id);
CREATE INDEX IF NOT EXISTS idx_demos_status ON demos (status);
CREATE INDEX IF NOT EXISTS idx_demos_created_at ON demos (created_at DESC);

ALTER TABLE demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read demos"
  ON demos FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert demos"
  ON demos FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update demos"
  ON demos FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete demos"
  ON demos FOR DELETE
  USING (is_admin());

-- ============================================================
-- TABLE: deals
-- ============================================================
CREATE TABLE IF NOT EXISTS deals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id       uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  stage             text NOT NULL DEFAULT 'open',
  value_estimate    numeric(10,2),
  monthly_recurring numeric(10,2),
  services          text[] NOT NULL DEFAULT '{}',
  probability       integer NOT NULL DEFAULT 50,
  close_date_target date,
  won_at            timestamptz,
  lost_at           timestamptz,
  lost_reason       text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_prospect_id ON deals (prospect_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
CREATE INDEX IF NOT EXISTS idx_deals_close_date_target ON deals (close_date_target);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals (created_at DESC);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read deals"
  ON deals FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert deals"
  ON deals FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update deals"
  ON deals FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete deals"
  ON deals FOR DELETE
  USING (is_admin());

-- ============================================================
-- TABLE: activities
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  deal_id     uuid REFERENCES deals(id) ON DELETE SET NULL,
  type        text NOT NULL,
  channel     text,
  direction   text,
  subject     text,
  body        text,
  status      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_activities_prospect_id ON activities (prospect_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities (deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities (type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities (created_at DESC);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activities"
  ON activities FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert activities"
  ON activities FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update activities"
  ON activities FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete activities"
  ON activities FOR DELETE
  USING (is_admin());

-- ============================================================
-- TABLE: sequences
-- ============================================================
CREATE TABLE IF NOT EXISTS sequences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  steps      jsonb NOT NULL DEFAULT '[]',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sequences_active ON sequences (active) WHERE active = true;

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read sequences"
  ON sequences FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert sequences"
  ON sequences FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sequences"
  ON sequences FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sequences"
  ON sequences FOR DELETE
  USING (is_admin());

-- ============================================================
-- TABLE: sequence_enrollments
-- ============================================================
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  sequence_id  uuid NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'active',
  started_at   timestamptz NOT NULL DEFAULT now(),
  paused_at    timestamptz,
  completed_at timestamptz,
  next_step_at timestamptz,
  UNIQUE (prospect_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_prospect_id ON sequence_enrollments (prospect_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_sequence_id ON sequence_enrollments (sequence_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_status ON sequence_enrollments (status);
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_next_step_at ON sequence_enrollments (next_step_at) WHERE status = 'active';

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read sequence_enrollments"
  ON sequence_enrollments FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert sequence_enrollments"
  ON sequence_enrollments FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sequence_enrollments"
  ON sequence_enrollments FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sequence_enrollments"
  ON sequence_enrollments FOR DELETE
  USING (is_admin());

-- ============================================================
-- TABLE: projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id      uuid REFERENCES deals(id) ON DELETE SET NULL,
  prospect_id  uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'website',
  status       text NOT NULL DEFAULT 'planning',
  start_date   date,
  target_date  date,
  completed_at timestamptz,
  milestones   jsonb NOT NULL DEFAULT '[]',
  monthly_value numeric(10,2),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_deal_id ON projects (deal_id);
CREATE INDEX IF NOT EXISTS idx_projects_prospect_id ON projects (prospect_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_target_date ON projects (target_date);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read projects"
  ON projects FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (is_admin());

-- ============================================================
-- TRIGGER FUNCTION: update_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers on tables with updated_at
CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_demos_updated_at
  BEFORE UPDATE ON demos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEW: pipeline_summary
-- ============================================================
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
  p.stage,
  COUNT(DISTINCT p.id)                                          AS prospect_count,
  COUNT(DISTINCT d.id)                                          AS demo_count,
  COUNT(DISTINCT dl.id)                                         AS deal_count,
  COALESCE(SUM(dl.value_estimate), 0)                           AS total_value_estimate,
  COALESCE(SUM(dl.monthly_recurring), 0)                        AS total_monthly_recurring,
  ROUND(AVG(p.prospect_score))                                  AS avg_prospect_score
FROM prospects p
LEFT JOIN demos  d  ON d.prospect_id = p.id
LEFT JOIN deals  dl ON dl.prospect_id = p.id
GROUP BY p.stage
ORDER BY
  CASE p.stage
    WHEN 'won'       THEN 1
    WHEN 'proposal'  THEN 2
    WHEN 'meeting'   THEN 3
    WHEN 'engaged'   THEN 4
    WHEN 'outreach'  THEN 5
    WHEN 'demo_built'THEN 6
    WHEN 'researched'THEN 7
    WHEN 'lost'      THEN 8
    ELSE 9
  END;

-- ============================================================
-- VIEW: recent_activities
-- ============================================================
CREATE OR REPLACE VIEW recent_activities AS
SELECT
  a.id,
  a.prospect_id,
  a.deal_id,
  a.type,
  a.channel,
  a.direction,
  a.subject,
  a.body,
  a.status,
  a.created_at,
  a.created_by,
  p.business_name,
  p.city,
  p.stage AS prospect_stage
FROM activities a
JOIN prospects p ON p.id = a.prospect_id
ORDER BY a.created_at DESC;
