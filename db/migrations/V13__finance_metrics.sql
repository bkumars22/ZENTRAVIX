-- V13: Finance department metrics
-- AI API costs per project + infrastructure costs + budget tracking

CREATE TABLE IF NOT EXISTS ai_cost_events (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  project         VARCHAR(20)  NOT NULL,
  model_id        VARCHAR(100) NOT NULL,
  task_type       VARCHAR(100),
  input_tokens    INT          NOT NULL DEFAULT 0,
  output_tokens   INT          NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(12,6) NOT NULL,
  latency_ms      INT,
  saved_vs_heavy  NUMERIC(12,6) DEFAULT 0,  -- savings from routing vs always-heavy
  recorded_at     TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ace_project_recorded ON ai_cost_events(project, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ace_model ON ai_cost_events(project, model_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS infra_cost_events (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project      VARCHAR(20) NOT NULL,
  provider     VARCHAR(50) NOT NULL,   -- railway | github | groq | anthropic | vercel
  service      VARCHAR(100) NOT NULL,
  cost_usd     NUMERIC(12,4) NOT NULL,
  period_start DATE        NOT NULL,
  period_end   DATE        NOT NULL,
  recorded_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ice_project_period ON infra_cost_events(project, period_start DESC);

CREATE TABLE IF NOT EXISTS cost_budget (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project                   VARCHAR(20) NOT NULL UNIQUE,
  monthly_ai_budget_usd     FLOAT       NOT NULL DEFAULT 50.0,
  monthly_infra_budget_usd  FLOAT       NOT NULL DEFAULT 30.0,
  alert_threshold_pct       INT         NOT NULL DEFAULT 80,
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Seed default budgets
INSERT INTO cost_budget (project, monthly_ai_budget_usd, monthly_infra_budget_usd, alert_threshold_pct)
VALUES
  ('QAIP',      50.0, 30.0, 80),
  ('SCIP',      30.0, 25.0, 80),
  ('ARIA',      40.0, 20.0, 80),
  ('ZENTRAVIX', 25.0, 15.0, 80)
ON CONFLICT (project) DO NOTHING;

CREATE TABLE IF NOT EXISTS dept_finance_snapshots (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_data    JSONB       NOT NULL,
  ceo_summary      TEXT,
  manager_summary  TEXT,
  engineer_summary TEXT,
  anomaly_count    INT         DEFAULT 0,
  critical_count   INT         DEFAULT 0,
  refreshed_at     TIMESTAMPTZ DEFAULT now()
);
