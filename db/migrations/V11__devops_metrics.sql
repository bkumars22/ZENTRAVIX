-- V11: DevOps department metrics
-- GitHub Actions workflow runs + Railway service health + deployment events

CREATE TABLE IF NOT EXISTS github_actions_runs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project          VARCHAR(20) NOT NULL,      -- QAIP | SCIP | ARIA
  workflow         VARCHAR(200) NOT NULL,
  run_id           BIGINT      NOT NULL,
  status           VARCHAR(20) NOT NULL,      -- success | failure | in_progress
  conclusion       VARCHAR(20),               -- success | failure | cancelled | skipped
  duration_seconds INT,
  triggered_by     VARCHAR(100),
  branch           VARCHAR(100) DEFAULT 'main',
  run_at           TIMESTAMPTZ NOT NULL,
  recorded_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gar_run_id ON github_actions_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_gar_project_ran ON github_actions_runs(project, run_at DESC);

CREATE TABLE IF NOT EXISTS railway_health (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project        VARCHAR(20) NOT NULL,
  service_name   VARCHAR(100) NOT NULL,
  status         VARCHAR(20) NOT NULL,  -- healthy | degraded | down
  cpu_pct        FLOAT,
  memory_mb      INT,
  uptime_pct     FLOAT,
  response_ms    INT,
  checked_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_project_checked ON railway_health(project, checked_at DESC);

CREATE TABLE IF NOT EXISTS deployment_events (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project       VARCHAR(20) NOT NULL,
  environment   VARCHAR(20) NOT NULL DEFAULT 'production',
  version       VARCHAR(50),
  status        VARCHAR(20) NOT NULL,  -- success | failed | rolledback
  deployed_by   VARCHAR(100),
  deployed_at   TIMESTAMPTZ NOT NULL,
  recorded_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_de_project_deployed ON deployment_events(project, deployed_at DESC);

CREATE TABLE IF NOT EXISTS dept_devops_snapshots (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_data   JSONB       NOT NULL,
  ceo_summary     TEXT,
  manager_summary TEXT,
  engineer_summary TEXT,
  anomaly_count   INT         DEFAULT 0,
  critical_count  INT         DEFAULT 0,
  refreshed_at    TIMESTAMPTZ DEFAULT now()
);
