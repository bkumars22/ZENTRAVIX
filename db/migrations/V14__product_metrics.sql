-- V14: Product department metrics
-- ARIA student sessions + QAIP pipeline runs + SCIP supplier events

CREATE TABLE IF NOT EXISTS aria_sessions (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id         VARCHAR(100) UNIQUE NOT NULL,
  student_age        INT,
  language           VARCHAR(20),        -- en | te | hi | ta | kn ...
  subject            VARCHAR(100),
  score              FLOAT,              -- 0.0 – 1.0
  socratic_compliant BOOLEAN,           -- engine did NOT give direct answer
  difficulty_level   VARCHAR(20),       -- easy | medium | hard
  duration_minutes   INT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_as_language ON aria_sessions(language, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_as_created ON aria_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_as_socratic ON aria_sessions(socratic_compliant, created_at DESC);

CREATE TABLE IF NOT EXISTS qaip_pipeline_runs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id           VARCHAR(100) UNIQUE NOT NULL,
  target_project   VARCHAR(20) NOT NULL,   -- SCIP | ARIA | ZENTRAVIX
  status           VARCHAR(20) NOT NULL,   -- success | failure | partial
  gap_count        INT         DEFAULT 0,
  deepeval_avg     FLOAT,
  tests_generated  INT         DEFAULT 0,
  defects_found    INT         DEFAULT 0,
  p0_found         INT         DEFAULT 0,
  duration_ms      INT,
  triggered_by     VARCHAR(50) DEFAULT 'webhook',  -- webhook | scheduler | manual
  run_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qpr_target_ran ON qaip_pipeline_runs(target_project, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_qpr_status ON qaip_pipeline_runs(status, run_at DESC);

CREATE TABLE IF NOT EXISTS scip_supplier_events (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id           VARCHAR(100) NOT NULL,
  supplier_name         VARCHAR(200),
  risk_score            FLOAT       NOT NULL,   -- 0.0 – 1.0 (IsolationForest output)
  health_status         VARCHAR(20) NOT NULL,   -- healthy | at_risk | critical
  is_anomaly            BOOLEAN     DEFAULT false,
  anomaly_reason        TEXT,
  active_pos            INT         DEFAULT 0,
  invoice_dispute_rate  FLOAT,
  on_time_delivery_rate FLOAT,
  recorded_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sse_health ON scip_supplier_events(health_status, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sse_anomaly ON scip_supplier_events(is_anomaly, recorded_at DESC);

CREATE TABLE IF NOT EXISTS dept_product_snapshots (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_data    JSONB       NOT NULL,
  ceo_summary      TEXT,
  manager_summary  TEXT,
  engineer_summary TEXT,
  anomaly_count    INT         DEFAULT 0,
  critical_count   INT         DEFAULT 0,
  refreshed_at     TIMESTAMPTZ DEFAULT now()
);

-- Universal critical alert table (all 4 departments)
CREATE TABLE IF NOT EXISTS dept_alerts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  department   VARCHAR(20) NOT NULL,  -- devops | security | finance | product
  project      VARCHAR(20),
  severity     VARCHAR(5)  NOT NULL,  -- P0 | P1 | P2
  title        VARCHAR(300) NOT NULL,
  detail       TEXT,
  is_pushed    BOOLEAN     DEFAULT false,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_severity ON dept_alerts(severity, is_pushed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_da_dept ON dept_alerts(department, created_at DESC);
