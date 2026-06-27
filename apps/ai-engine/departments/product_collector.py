"""
Product collector — ARIA student sessions + QAIP pipeline runs + SCIP supplier events.
All sourced from PostgreSQL tables populated by each product's backend service.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import psycopg2
import psycopg2.extras

logger = logging.getLogger("zentravix.dept.product")

DATABASE_URL = os.getenv("DATABASE_URL", "")


def _db():
    return psycopg2.connect(DATABASE_URL)


# ── ARIA ──────────────────────────────────────────────────────────────────────

def _fetch_aria(conn, days: int = 7) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    data: dict = {"total_sessions": 0, "active_students": 0}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                  COUNT(*)                                        AS total_sessions,
                  COUNT(DISTINCT session_id)                      AS unique_sessions,
                  AVG(score)                                      AS avg_score,
                  SUM(CASE WHEN socratic_compliant THEN 1 ELSE 0 END)::FLOAT
                    / NULLIF(COUNT(*), 0)                         AS socratic_rate,
                  COUNT(DISTINCT language)                        AS lang_count
                FROM aria_sessions
                WHERE created_at >= %s
                """,
                (since,),
            )
            row = cur.fetchone()
            if row:
                data.update({
                    "total_sessions":  int(row["total_sessions"] or 0),
                    "avg_score":       round(float(row["avg_score"] or 0), 3),
                    "socratic_rate":   round(float(row["socratic_rate"] or 0), 3),
                    "language_count":  int(row["lang_count"] or 0),
                })

            # Language breakdown
            cur.execute(
                """
                SELECT language, COUNT(*) AS sessions
                FROM aria_sessions
                WHERE created_at >= %s AND language IS NOT NULL
                GROUP BY language
                ORDER BY sessions DESC
                LIMIT 10
                """,
                (since,),
            )
            data["top_languages"] = [dict(r) for r in cur.fetchall()]

            # Difficulty distribution
            cur.execute(
                """
                SELECT difficulty_level, COUNT(*) AS count
                FROM aria_sessions
                WHERE created_at >= %s AND difficulty_level IS NOT NULL
                GROUP BY difficulty_level
                """,
                (since,),
            )
            data["difficulty_dist"] = {r["difficulty_level"]: r["count"] for r in cur.fetchall()}

            # Daily session trend
            cur.execute(
                """
                SELECT DATE(created_at) AS day, COUNT(*) AS sessions
                FROM aria_sessions
                WHERE created_at >= %s
                GROUP BY day ORDER BY day
                """,
                (since,),
            )
            data["daily_trend"] = [{"day": str(r["day"]), "sessions": r["sessions"]} for r in cur.fetchall()]
    except Exception as exc:
        logger.warning("ARIA fetch failed: %s", exc)
    return data


# ── QAIP ──────────────────────────────────────────────────────────────────────

def _fetch_qaip(conn, days: int = 7) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    data: dict = {}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                  COUNT(*)                                         AS total_runs,
                  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
                  AVG(deepeval_avg)                                AS avg_deepeval,
                  SUM(gap_count)                                   AS total_gaps,
                  SUM(tests_generated)                             AS total_tests_gen,
                  SUM(defects_found)                               AS total_defects,
                  SUM(p0_found)                                    AS total_p0
                FROM qaip_pipeline_runs
                WHERE run_at >= %s
                """,
                (since,),
            )
            row = cur.fetchone()
            if row:
                total = int(row["total_runs"] or 0)
                success = int(row["success_count"] or 0)
                data.update({
                    "total_runs":      total,
                    "success_rate":    round(success / max(total, 1), 3),
                    "avg_deepeval":    round(float(row["avg_deepeval"] or 0), 3),
                    "total_gaps":      int(row["total_gaps"] or 0),
                    "tests_generated": int(row["total_tests_gen"] or 0),
                    "defects_found":   int(row["total_defects"] or 0),
                    "p0_found":        int(row["total_p0"] or 0),
                })

            # Per-target breakdown
            cur.execute(
                """
                SELECT target_project,
                       COUNT(*) AS runs,
                       AVG(deepeval_avg) AS avg_deval,
                       SUM(defects_found) AS defects
                FROM qaip_pipeline_runs
                WHERE run_at >= %s
                GROUP BY target_project
                """,
                (since,),
            )
            data["by_project"] = {
                r["target_project"]: {
                    "runs": r["runs"],
                    "avg_deepeval": round(float(r["avg_deval"] or 0), 3),
                    "defects": r["defects"],
                }
                for r in cur.fetchall()
            }
    except Exception as exc:
        logger.warning("QAIP pipeline fetch failed: %s", exc)
    return data


# ── SCIP ──────────────────────────────────────────────────────────────────────

def _fetch_scip(conn) -> dict:
    data: dict = {}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Latest snapshot per supplier
            cur.execute(
                """
                SELECT DISTINCT ON (supplier_id)
                  supplier_id, supplier_name, risk_score, health_status,
                  is_anomaly, anomaly_reason, active_pos, recorded_at
                FROM scip_supplier_events
                ORDER BY supplier_id, recorded_at DESC
                """,
            )
            rows = cur.fetchall()
            total = len(rows)
            critical = [r for r in rows if r["health_status"] == "critical"]
            at_risk  = [r for r in rows if r["health_status"] == "at_risk"]
            anomalies = [r for r in rows if r["is_anomaly"]]

            data = {
                "total_suppliers": total,
                "healthy":         total - len(critical) - len(at_risk),
                "at_risk":         len(at_risk),
                "critical":        len(critical),
                "anomaly_count":   len(anomalies),
                "avg_risk_score":  round(sum(float(r["risk_score"]) for r in rows) / max(total, 1), 3),
                "critical_suppliers": [dict(r) for r in critical[:5]],
                "anomaly_suppliers":  [dict(r) for r in anomalies[:5]],
            }
    except Exception as exc:
        logger.warning("SCIP supplier fetch failed: %s", exc)
    return data


def collect_product() -> dict[str, Any]:
    result: dict[str, Any] = {
        "department":   "product",
        "aria":         {},
        "qaip":         {},
        "scip":         {},
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    conn = None
    try:
        conn = _db()
        result["aria"] = _fetch_aria(conn)
        result["qaip"] = _fetch_qaip(conn)
        result["scip"] = _fetch_scip(conn)
    except Exception as exc:
        logger.error("Product collect error: %s", exc)
        result["error"] = str(exc)
    finally:
        if conn:
            conn.close()

    # Anomalies
    anomalies = []
    aria = result["aria"]
    qaip = result["qaip"]
    scip = result["scip"]

    if aria.get("socratic_rate", 1.0) < 0.85:
        anomalies.append({"project": "ARIA", "severity": "P1", "type": "socratic_low",
                           "msg": f"ARIA Socratic compliance {aria['socratic_rate']:.0%} — below 85% target"})

    if qaip.get("p0_found", 0) > 0:
        anomalies.append({"project": "QAIP", "severity": "P0", "type": "p0_defect",
                           "msg": f"QAIP found {qaip['p0_found']} P0 defect(s) in latest pipeline runs"})
    if qaip.get("success_rate", 1.0) < 0.80:
        anomalies.append({"project": "QAIP", "severity": "P1", "type": "pipeline_reliability",
                           "msg": f"QAIP pipeline success rate {qaip['success_rate']:.0%} — below 80%"})

    if scip.get("critical", 0) > 0:
        anomalies.append({"project": "SCIP", "severity": "P0", "type": "critical_suppliers",
                           "msg": f"SCIP has {scip['critical']} CRITICAL risk supplier(s) — immediate action needed"})
    if scip.get("anomaly_count", 0) > 3:
        anomalies.append({"project": "SCIP", "severity": "P1", "type": "supplier_anomalies",
                           "msg": f"SCIP IsolationForest flagged {scip['anomaly_count']} supplier anomalies"})

    result["anomalies"]     = anomalies
    result["critical_count"] = sum(1 for a in anomalies if a["severity"] == "P0")
    return result
