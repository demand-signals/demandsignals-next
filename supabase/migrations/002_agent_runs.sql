-- Agent Runs table: tracks every execution of every agent
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error TEXT,
  prospects_created INT DEFAULT 0,
  prospects_updated INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_runs_name_started ON agent_runs (agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs (status);

-- RLS: admins can read, service role can manage
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agent runs"
  ON agent_runs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role manages agent runs"
  ON agent_runs FOR ALL
  USING (auth.role() = 'service_role');
