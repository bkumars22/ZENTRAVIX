"""
LangGraph department pipeline — single parameterized graph for all 4 departments.

Graph flow per department:
  collect → analyse → [ceo_summary, manager_summary, engineer_summary]
          → alert_check → push_alerts (if P0/P1)

Scheduler calls run_department() every 15 minutes via APScheduler.
"""
from __future__ import annotations

import os
import json
import logging
import psycopg2
from datetime import datetime, timezone
from typing import Any, TypedDict

import redis as redis_lib
from langgraph.graph import StateGraph, END

from .role_summaries   import generate_ceo, generate_manager, generate_engineer
from .websocket_push   import push_snapshot, push_critical_alert

logger = logging.getLogger("zentravix.dept.langgraph")

DATABASE_URL = os.getenv("DATABASE_URL", "")
REDIS_URL    = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis: redis_lib.Redis | None = None


def _get_redis() -> redis_lib.Redis:
    global _redis
    if _redis is None:
        _redis = redis_lib.from_url(REDIS_URL, decode_responses=True)
    return _redis


# ── State schema ──────────────────────────────────────────────────────────────

class DeptState(TypedDict):
    department:    str
    raw:           dict          # output from collector
    analysed:      dict          # enriched / computed metrics
    ceo_summary:   str
    manager_summary: str
    engineer_summary: str
    anomalies:     list[dict]
    critical_count: int
    snapshot_id:   str


# ── Node implementations ───────────────────────────────────────────────────────

def node_collect(state: DeptState) -> DeptState:
    from . import COLLECTORS
    dept = state["department"]
    logger.info("[%s] collecting data", dept.upper())
    raw = COLLECTORS[dept]()
    return {**state, "raw": raw, "anomalies": raw.get("anomalies", []),
            "critical_count": raw.get("critical_count", 0)}


def node_analyse(state: DeptState) -> DeptState:
    """Enrich raw data with computed stats, severity buckets, trend labels."""
    raw  = state["raw"]
    dept = state["department"]
    analysed: dict = {"department": dept, "projects": {}}

    if dept == "devops":
        for proj, data in raw.get("projects", {}).items():
            gh  = data.get("github_actions", {})
            rh  = data.get("railway_health", {})
            rate = gh.get("success_rate", 1.0)
            analysed["projects"][proj] = {
                **data,
                "ci_health_label": "good" if rate >= 0.9 else ("warning" if rate >= 0.7 else "critical"),
                "service_label":   "up" if rh.get("status") == "healthy" else "degraded",
            }

    elif dept == "security":
        for proj, data in raw.get("projects", {}).items():
            de = data.get("deepeval", {})
            ow = data.get("owasp", {})
            score = de.get("avg_overall")
            analysed["projects"][proj] = {
                **data,
                "security_grade": ("A" if score and score >= 0.90 else
                                   "B" if score and score >= 0.80 else
                                   "C" if score and score >= 0.70 else "F"),
                "owasp_clean": ow.get("all_clear", True),
            }
        analysed["rbac_denied_24h"] = raw.get("rbac_denied_24h", [])

    elif dept == "finance":
        analysed["projects"]       = raw.get("projects", {})
        analysed["platform_total"] = raw.get("platform_total", {})
        total_cost = analysed["platform_total"].get("ai_cost", 0)
        total_save = analysed["platform_total"].get("total_saved", 0)
        analysed["platform_savings_pct"] = round(
            total_save / max(total_cost + total_save, 0.001) * 100, 1
        )

    elif dept == "product":
        aria = raw.get("aria", {})
        qaip = raw.get("qaip", {})
        scip = raw.get("scip", {})
        analysed["aria"] = {**aria, "health_label": "good" if aria.get("socratic_rate", 0) >= 0.85 else "warning"}
        analysed["qaip"] = {**qaip, "health_label": "good" if qaip.get("p0_found", 0) == 0 else "critical"}
        analysed["scip"] = {**scip, "health_label": "good" if scip.get("critical", 0) == 0 else "critical"}

    return {**state, "analysed": analysed}


def node_ceo_summary(state: DeptState) -> DeptState:
    summary = generate_ceo(state["department"], state["analysed"], state["anomalies"])
    return {**state, "ceo_summary": summary}


def node_manager_summary(state: DeptState) -> DeptState:
    summary = generate_manager(state["department"], state["analysed"], state["anomalies"])
    return {**state, "manager_summary": summary}


def node_engineer_summary(state: DeptState) -> DeptState:
    summary = generate_engineer(state["department"], state["analysed"], state["anomalies"])
    return {**state, "engineer_summary": summary}


def node_store(state: DeptState) -> DeptState:
    """Persist snapshot to PostgreSQL and Redis cache."""
    dept = state["department"]
    payload = {
        "department":       dept,
        "analysed":         state["analysed"],
        "anomalies":        state["anomalies"],
        "critical_count":   state["critical_count"],
        "ceo_summary":      state["ceo_summary"],
        "manager_summary":  state["manager_summary"],
        "engineer_summary": state["engineer_summary"],
        "refreshed_at":     datetime.now(timezone.utc).isoformat(),
    }

    # Store in Redis (5-minute TTL for sub-15m cache)
    try:
        r = _get_redis()
        r.setex(f"zentravix:dept:{dept}:snapshot", 900, json.dumps(payload))
    except Exception as exc:
        logger.warning("Redis store failed for %s: %s", dept, exc)

    # Store in PostgreSQL
    table_map = {
        "devops":   "dept_devops_snapshots",
        "security": "dept_security_snapshots",
        "finance":  "dept_finance_snapshots",
        "product":  "dept_product_snapshots",
    }
    table = table_map.get(dept)
    snap_id = ""
    if table:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    INSERT INTO {table}
                      (snapshot_data, ceo_summary, manager_summary, engineer_summary,
                       anomaly_count, critical_count)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (json.dumps(state["analysed"]),
                     state["ceo_summary"], state["manager_summary"], state["engineer_summary"],
                     len(state["anomalies"]), state["critical_count"]),
                )
                snap_id = str(cur.fetchone()[0])
            conn.commit()
            conn.close()
        except Exception as exc:
            logger.error("DB store failed for %s: %s", dept, exc)

    return {**state, "snapshot_id": snap_id}


def node_push_alerts(state: DeptState) -> DeptState:
    """WebSocket push for critical (P0) anomalies immediately."""
    dept = state["department"]
    snapshot = {
        "department":      dept,
        "ceo_summary":     state["ceo_summary"],
        "manager_summary": state["manager_summary"],
        "engineer_summary":state["engineer_summary"],
        "anomalies":       state["anomalies"],
        "critical_count":  state["critical_count"],
        "refreshed_at":    datetime.now(timezone.utc).isoformat(),
    }
    push_snapshot(dept, snapshot)

    for a in state["anomalies"]:
        if a.get("severity") in ("P0", "P1"):
            push_critical_alert(dept, a)

    return state


# ── Graph assembly ─────────────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    g = StateGraph(DeptState)

    g.add_node("collect",           node_collect)
    g.add_node("analyse",           node_analyse)
    g.add_node("ceo_summary",       node_ceo_summary)
    g.add_node("manager_summary",   node_manager_summary)
    g.add_node("engineer_summary",  node_engineer_summary)
    g.add_node("store",             node_store)
    g.add_node("push_alerts",       node_push_alerts)

    g.set_entry_point("collect")
    g.add_edge("collect",          "analyse")
    g.add_edge("analyse",          "ceo_summary")
    g.add_edge("ceo_summary",      "manager_summary")
    g.add_edge("manager_summary",  "engineer_summary")
    g.add_edge("engineer_summary", "store")
    g.add_edge("store",            "push_alerts")
    g.add_edge("push_alerts",      END)

    return g.compile()


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph()
    return _compiled_graph


def run_department(department: str) -> dict:
    """Entry point — call this from APScheduler or API trigger."""
    logger.info("Running LangGraph pipeline for department: %s", department.upper())
    graph = get_graph()
    initial: DeptState = {
        "department":       department,
        "raw":              {},
        "analysed":         {},
        "ceo_summary":      "",
        "manager_summary":  "",
        "engineer_summary": "",
        "anomalies":        [],
        "critical_count":   0,
        "snapshot_id":      "",
    }
    try:
        final = graph.invoke(initial)
        logger.info("[%s] pipeline done — %d anomalies, %d critical",
                    department.upper(), len(final["anomalies"]), final["critical_count"])
        return final
    except Exception as exc:
        logger.error("[%s] pipeline error: %s", department.upper(), exc)
        return {"error": str(exc)}


def get_cached_snapshot(department: str) -> dict | None:
    """Fast path — return Redis-cached snapshot without re-running pipeline."""
    try:
        r = _get_redis()
        raw = r.get(f"zentravix:dept:{department}:snapshot")
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return None
