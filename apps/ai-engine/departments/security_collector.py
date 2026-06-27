"""
Security collector — deepeval scores + RBAC denied access logs + OWASP scan results.
Reads from the shared PostgreSQL database populated by QAIP and SCIP services.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import psycopg2
import psycopg2.extras

logger = logging.getLogger("zentravix.dept.security")

DATABASE_URL = os.getenv("DATABASE_URL", "")

OWASP_CATEGORIES = [
    "A01:BrokenAccessControl",
    "A02:CryptographicFailure",
    "A03:Injection",
    "A04:InsecureDesign",
    "A05:SecurityMisconfiguration",
    "A07:AuthenticationFailure",
    "A09:SecurityLoggingFailure",
]


def _db():
    return psycopg2.connect(DATABASE_URL)


def _fetch_deepeval(conn, days: int = 7) -> dict[str, list[dict]]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    results: dict[str, list] = {"QAIP": [], "SCIP": [], "ARIA": []}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT project, metric, AVG(score) AS avg_score,
                       MIN(score) AS min_score, COUNT(*) AS runs,
                       BOOL_AND(passed) AS all_passed,
                       threshold
                FROM deepeval_scores
                WHERE run_at >= %s
                GROUP BY project, metric, threshold
                ORDER BY project, metric
                """,
                (since,),
            )
            for row in cur.fetchall():
                proj = row["project"]
                if proj in results:
                    results[proj].append(dict(row))
    except Exception as exc:
        logger.warning("deepeval fetch failed: %s", exc)
    return results


def _fetch_rbac_denied(conn, hours: int = 24) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT project, role, action, resource, COUNT(*) AS count,
                       MAX(logged_at) AS last_seen
                FROM rbac_audit_log
                WHERE allowed = false AND logged_at >= %s
                GROUP BY project, role, action, resource
                ORDER BY count DESC
                LIMIT 20
                """,
                (since,),
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as exc:
        logger.warning("RBAC denied fetch failed: %s", exc)
        return []


def _fetch_owasp(conn) -> dict[str, list[dict]]:
    results: dict[str, list] = {"QAIP": [], "SCIP": [], "ARIA": []}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (project, category)
                  project, category, severity, vuln_count, scan_at
                FROM owasp_scan_results
                ORDER BY project, category, scan_at DESC
                """,
            )
            for row in cur.fetchall():
                proj = row["project"]
                if proj in results:
                    results[proj].append(dict(row))
    except Exception as exc:
        logger.warning("OWASP fetch failed: %s", exc)
    return results


def _deepeval_summary(scores: list[dict]) -> dict:
    if not scores:
        return {"avg_overall": None, "failed_metrics": [], "all_passed": True}
    failed = [s["metric"] for s in scores if not s.get("all_passed", True)]
    avg = sum(float(s["avg_score"]) for s in scores) / len(scores)
    return {
        "avg_overall":   round(avg, 3),
        "failed_metrics": failed,
        "all_passed":    len(failed) == 0,
        "metric_detail": scores,
    }


def _owasp_summary(vulns: list[dict]) -> dict:
    critical = [v for v in vulns if v["severity"] == "CRITICAL" and v["vuln_count"] > 0]
    high     = [v for v in vulns if v["severity"] == "HIGH"     and v["vuln_count"] > 0]
    return {
        "critical_count": sum(v["vuln_count"] for v in critical),
        "high_count":     sum(v["vuln_count"] for v in high),
        "critical_vulns": critical,
        "high_vulns":     high,
        "all_clear":      len(critical) == 0 and len(high) == 0,
    }


def collect_security() -> dict[str, Any]:
    """Collect security metrics for all 3 projects."""
    result: dict[str, Any] = {
        "department": "security",
        "projects": {},
        "rbac_denied_24h": [],
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    conn = None
    try:
        conn = _db()
        deepeval_data = _fetch_deepeval(conn)
        rbac_denied   = _fetch_rbac_denied(conn)
        owasp_data    = _fetch_owasp(conn)

        result["rbac_denied_24h"] = rbac_denied

        for project in ("QAIP", "SCIP", "ARIA"):
            result["projects"][project] = {
                "deepeval": _deepeval_summary(deepeval_data[project]),
                "owasp":    _owasp_summary(owasp_data[project]),
            }
    except Exception as exc:
        logger.error("Security collect error: %s", exc)
        result["error"] = str(exc)
    finally:
        if conn:
            conn.close()

    # Anomaly detection
    anomalies = []
    for proj, data in result["projects"].items():
        de = data.get("deepeval", {})
        ow = data.get("owasp", {})

        if de.get("avg_overall") is not None and de["avg_overall"] < 0.70:
            anomalies.append({"project": proj, "severity": "P1", "type": "deepeval_low",
                               "msg": f"{proj} deepeval avg {de['avg_overall']:.2f} — below 0.70 threshold"})
        if de.get("failed_metrics"):
            anomalies.append({"project": proj, "severity": "P2", "type": "deepeval_failed_metrics",
                               "msg": f"{proj} failed metrics: {', '.join(de['failed_metrics'])}"})
        if ow.get("critical_count", 0) > 0:
            anomalies.append({"project": proj, "severity": "P0", "type": "owasp_critical",
                               "msg": f"{proj} has {ow['critical_count']} CRITICAL OWASP vulnerabilities"})
        if ow.get("high_count", 0) > 3:
            anomalies.append({"project": proj, "severity": "P1", "type": "owasp_high",
                               "msg": f"{proj} has {ow['high_count']} HIGH severity OWASP findings"})

    if len(rbac_denied) > 50:
        anomalies.append({"project": "ALL", "severity": "P1", "type": "rbac_spike",
                           "msg": f"Spike in denied access attempts: {len(rbac_denied)} unique patterns in 24h"})

    result["anomalies"]     = anomalies
    result["critical_count"] = sum(1 for a in anomalies if a["severity"] == "P0")
    return result
