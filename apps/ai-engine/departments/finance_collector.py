"""
Finance collector — AI API costs per project + infrastructure costs + budget tracking.
Reads from ai_cost_events (populated by cost_tracker.py in each project) and infra_cost_events.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import psycopg2
import psycopg2.extras

logger = logging.getLogger("zentravix.dept.finance")

DATABASE_URL = os.getenv("DATABASE_URL", "")


def _db():
    return psycopg2.connect(DATABASE_URL)


def _fetch_ai_costs(conn, period_days: int = 30) -> dict[str, dict]:
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    by_project: dict[str, dict] = {}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT project,
                       SUM(cost_usd)          AS total_cost,
                       SUM(saved_vs_heavy)     AS total_saved,
                       COUNT(*)               AS call_count,
                       SUM(input_tokens)      AS total_input_tokens,
                       SUM(output_tokens)     AS total_output_tokens,
                       AVG(latency_ms)        AS avg_latency_ms
                FROM ai_cost_events
                WHERE recorded_at >= %s
                GROUP BY project
                """,
                (since,),
            )
            for row in cur.fetchall():
                by_project[row["project"]] = dict(row)

            # Per-model breakdown
            cur.execute(
                """
                SELECT project, model_id,
                       SUM(cost_usd)  AS cost,
                       COUNT(*)       AS calls
                FROM ai_cost_events
                WHERE recorded_at >= %s
                GROUP BY project, model_id
                ORDER BY project, cost DESC
                """,
                (since,),
            )
            model_breakdown: dict[str, list] = {}
            for row in cur.fetchall():
                model_breakdown.setdefault(row["project"], []).append(dict(row))

            for proj in by_project:
                by_project[proj]["model_breakdown"] = model_breakdown.get(proj, [])

    except Exception as exc:
        logger.warning("AI cost fetch failed: %s", exc)
    return by_project


def _fetch_infra_costs(conn) -> dict[str, dict]:
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)
    by_project: dict[str, dict] = {}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT project, provider,
                       SUM(cost_usd) AS cost
                FROM infra_cost_events
                WHERE period_start >= %s
                GROUP BY project, provider
                ORDER BY project, cost DESC
                """,
                (month_start,),
            )
            for row in cur.fetchall():
                proj = row["project"]
                by_project.setdefault(proj, {"total": 0.0, "by_provider": {}})
                by_project[proj]["by_provider"][row["provider"]] = float(row["cost"])
                by_project[proj]["total"] = round(by_project[proj]["total"] + float(row["cost"]), 4)
    except Exception as exc:
        logger.warning("Infra cost fetch failed: %s", exc)
    return by_project


def _fetch_budgets(conn) -> dict[str, dict]:
    budgets: dict[str, dict] = {}
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM cost_budget")
            for row in cur.fetchall():
                budgets[row["project"]] = dict(row)
    except Exception as exc:
        logger.warning("Budget fetch failed: %s", exc)
    return budgets


def _daily_trend(conn, project: str, days: int = 14) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DATE(recorded_at) AS day, SUM(cost_usd) AS cost
                FROM ai_cost_events
                WHERE project = %s AND recorded_at >= %s
                GROUP BY day
                ORDER BY day
                """,
                (project, since),
            )
            return [{"day": str(r["day"]), "cost": float(r["cost"])} for r in cur.fetchall()]
    except Exception:
        return []


def collect_finance() -> dict[str, Any]:
    result: dict[str, Any] = {
        "department": "finance",
        "projects": {},
        "platform_total": {},
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    conn = None
    try:
        conn = _db()
        ai_costs    = _fetch_ai_costs(conn)
        infra_costs = _fetch_infra_costs(conn)
        budgets     = _fetch_budgets(conn)

        for project in ("QAIP", "SCIP", "ARIA", "ZENTRAVIX"):
            ai  = ai_costs.get(project, {"total_cost": 0.0, "total_saved": 0.0, "call_count": 0})
            inf = infra_costs.get(project, {"total": 0.0, "by_provider": {}})
            bud = budgets.get(project, {"monthly_ai_budget_usd": 50.0, "monthly_infra_budget_usd": 30.0, "alert_threshold_pct": 80})

            ai_total    = float(ai.get("total_cost") or 0)
            infra_total = float(inf.get("total") or 0)
            ai_budget   = float(bud.get("monthly_ai_budget_usd", 50))
            infra_budget = float(bud.get("monthly_infra_budget_usd", 30))
            threshold   = int(bud.get("alert_threshold_pct", 80))

            result["projects"][project] = {
                "ai": {
                    "cost_30d":       round(ai_total, 4),
                    "saved_30d":      round(float(ai.get("total_saved") or 0), 4),
                    "call_count":     ai.get("call_count", 0),
                    "savings_pct":    round(float(ai.get("total_saved") or 0) / max(ai_total + float(ai.get("total_saved") or 0), 0.001) * 100, 1),
                    "budget":         ai_budget,
                    "budget_used_pct": round(ai_total / max(ai_budget, 0.001) * 100, 1),
                    "model_breakdown": ai.get("model_breakdown", []),
                    "daily_trend":    _daily_trend(conn, project),
                },
                "infra": {
                    "cost_month": round(infra_total, 4),
                    "budget":     infra_budget,
                    "budget_used_pct": round(infra_total / max(infra_budget, 0.001) * 100, 1),
                    "by_provider": inf.get("by_provider", {}),
                },
                "alert_threshold_pct": threshold,
            }

        # Platform totals
        result["platform_total"] = {
            "ai_cost":      round(sum(result["projects"][p]["ai"]["cost_30d"]   for p in result["projects"]), 4),
            "infra_cost":   round(sum(result["projects"][p]["infra"]["cost_month"] for p in result["projects"]), 4),
            "total_saved":  round(sum(result["projects"][p]["ai"]["saved_30d"]  for p in result["projects"]), 4),
        }

    except Exception as exc:
        logger.error("Finance collect error: %s", exc)
        result["error"] = str(exc)
    finally:
        if conn:
            conn.close()

    # Anomalies
    anomalies = []
    for proj, data in result["projects"].items():
        ai_pct    = data["ai"]["budget_used_pct"]
        infra_pct = data["infra"]["budget_used_pct"]
        threshold = data["alert_threshold_pct"]
        if ai_pct >= 100:
            anomalies.append({"project": proj, "severity": "P0", "type": "budget_exceeded",
                               "msg": f"{proj} AI cost budget EXCEEDED — {ai_pct:.0f}% used"})
        elif ai_pct >= threshold:
            anomalies.append({"project": proj, "severity": "P1", "type": "budget_warning",
                               "msg": f"{proj} AI cost at {ai_pct:.0f}% of monthly budget"})
        if infra_pct >= 100:
            anomalies.append({"project": proj, "severity": "P1", "type": "infra_budget_exceeded",
                               "msg": f"{proj} infra cost EXCEEDED monthly budget — {infra_pct:.0f}% used"})

    result["anomalies"]     = anomalies
    result["critical_count"] = sum(1 for a in anomalies if a["severity"] == "P0")
    return result
