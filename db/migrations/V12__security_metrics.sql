-- V12: Security department metrics
-- deepeval AI quality scores + RBAC audit log + OWASP scan results

CREATE TABLE IF NOT EXISTS deepeval_scores (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project       VARCHAR(20) NOT NULL,           -- QAIP | SCIP | ARIA
  test_suite    VARCHAR(100) NOT NULL,
  metric        VARCHAR(50) NOT NULL,            -- completeness | relevance | hallucination | structure | length
  score         FLOAT       NOT NULL,
  threshold     FLOAT       NOT NULL DEFAULT 0.75,
  passed        BOOLEAN     NOT NULL,
  sample_count  INT         DEFAULT 0,
  run_at        TIMESTAMPTZ NOT NULL,
  recorded_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ds_project_run ON deepeval_scores(project, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_passed ON deepeval_scores(project, passed, run_at DESC);

CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project      VARCHAR(20) NOT NULL,
  user_email   VARCHAR(200),
  role         VARCHAR(50),
  action       VARCHAR(100) NOT NULL,   -- GET | POST | DELETE | ADMIN_OVERRIDE
  resource     VARCHAR(200) NOT NULL,
  allowed      BOOLEAN     NOT NULL,
  ip_address   VARCHAR(50),
  logged_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ral_project_logged ON rbac_audit_log(project, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_ral_denied ON rbac_audit_log(project, allowed, logged_at DESC);

CREATE TABLE IF NOT EXISTS owasp_scan_results (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project      VARCHAR(20) NOT NULL,
  category     VARCHAR(100) NOT NULL,  -- A01:BrokenAccess | A03:Injection | A07:AuthFailure ...
  severity     VARCHAR(20) NOT NULL,   -- CRITICAL | HIGH | MEDIUM | LOW
  vuln_count   INT         DEFAULT 0,
  description  TEXT,
  scan_at      TIMESTAMPTZ NOT NULL,
  recorded_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osr_project_scan ON owasp_scan_results(project, scan_at DESC);
CREATE INDEX IF NOT EXISTS idx_osr_severity ON owasp_scan_results(project, severity, scan_at DESC);

CREATE TABLE IF NOT EXISTS dept_security_snapshots (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_data    JSONB       NOT NULL,
  ceo_summary      TEXT,
  manager_summary  TEXT,
  engineer_summary TEXT,
  anomaly_count    INT         DEFAULT 0,
  critical_count   INT         DEFAULT 0,
  refreshed_at     TIMESTAMPTZ DEFAULT now()
);
