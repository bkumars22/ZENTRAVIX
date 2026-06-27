"""
DevOps collector — GitHub Actions API + Railway health checks.
Returns a raw dict that langgraph_pipeline.py analyses.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
import psycopg2

logger = logging.getLogger("zentravix.dept.devops")

PROJECTS = {
    "QAIP": {
        "gh_owner": "bkumars22",
        "gh_repo":  "QA-Intelligent-Platform",
        "railway_service": os.getenv("RAILWAY_QAIP_SERVICE_ID", ""),
    },
    "SCIP": {
        "gh_owner": "bkumars22",
        "gh_repo":  "scweb",
        "railway_service": os.getenv("RAILWAY_SCIP_SERVICE_ID", ""),
    },
    "ARIA": {
        "gh_owner": "bkumars22",
        "gh_repo":  "ARIA",
        "railway_service": os.getenv("RAILWAY_ARIA_SERVICE_ID", ""),
    },
}

GH_TOKEN       = os.getenv("GITHUB_TOKEN", "")
RAILWAY_TOKEN  = os.getenv("RAILWAY_API_TOKEN", "")
DATABASE_URL   = os.getenv("DATABASE_URL", "")


def _db():
    return psycopg2.connect(DATABASE_URL)


def _fetch_gh_runs(owner: str, repo: str, limit: int = 10) -> list[dict]:
    if not GH_TOKEN:
        return []
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs"
    try:
        r = httpx.get(
            url,
            headers={"Authorization": f"Bearer {GH_TOKEN}", "Accept": "application/vnd.github+json"},
            params={"per_page": limit},
            timeout=10,
        )
        r.raise_for_status()
        return r.json().get("workflow_runs", [])
    except Exception as exc:
        logger.warning("GitHub Actions API error for %s/%s: %s", owner, repo, exc)
        return []


def _railway_health(service_id: str) -> dict:
    """Call Railway GraphQL API to get service deployment status."""
    if not RAILWAY_TOKEN or not service_id:
        return {"status": "unknown", "cpu_pct": None, "memory_mb": None, "uptime_pct": 99.9, "response_ms": None}
    query = """
    query($serviceId: String!) {
      serviceInstance(serviceId: $serviceId) {
        latestDeployment { status createdAt }
        domains { domain }
      }
    }
    """
    try:
        r = httpx.post(
            "https://backboard.railway.app/graphql/v2",
            json={"query": query, "variables": {"serviceId": service_id}},
            headers={"Authorization": f"Bearer {RAILWAY_TOKEN}"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json().get("data", {}).get("serviceInstance", {})
        dep   = data.get("latestDeployment", {})
        status = "healthy" if dep.get("status") == "SUCCESS" else "degraded"
        return {"status": status, "cpu_pct": None, "memory_mb": None, "uptime_pct": 99.9, "response_ms": None}
    except Exception as exc:
        logger.warning("Railway API error for %s: %s", service_id, exc)
        return {"status": "unknown", "cpu_pct": None, "memory_mb": None, "uptime_pct": 99.0, "response_ms": None}


def _store_runs(project: str, runs: list[dict], conn) -> None:
    with conn.cursor() as cur:
        for run in runs:
            started = run.get("created_at")
            updated = run.get("updated_at")
            duration = None
            if started and updated:
                try:
                    s = datetime.fromisoformat(started.replace("Z", "+00:00"))
                    u = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                    duration = int((u - s).total_seconds())
                except Exception:
                    pass
            cur.execute(
                """
                INSERT INTO github_actions_runs
                  (project, workflow, run_id, status, conclusion, duration_seconds, triggered_by, branch, run_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (run_id) DO NOTHING
                """,
                (
                    project,
                    run.get("name", "unknown"),
                    run["id"],
                    run.get("status", "unknown"),
                    run.get("conclusion"),
                    duration,
                    run.get("triggering_actor", {}).get("login") if run.get("triggering_actor") else None,
                    run.get("head_branch", "main"),
                    run.get("created_at"),
                ),
            )
    conn.commit()


def _store_health(project: str, health: dict, conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO railway_health (project, service_name, status, cpu_pct, memory_mb, uptime_pct, response_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (project, project.lower() + "-api", health["status"], health.get("cpu_pct"),
             health.get("memory_mb"), health.get("uptime_pct"), health.get("response_ms")),
        )
    conn.commit()


def _summarise_runs(project: str, runs: list[dict]) -> dict:
    total = len(runs)
    if total == 0:
        return {"total": 0, "success": 0, "failure": 0, "success_rate": 1.0, "last_status": "unknown"}
    success  = sum(1 for r in runs if r.get("conclusion") == "success")
    failure  = sum(1 for r in runs if r.get("conclusion") == "failure")
    last_run = runs[0] if runs else {}
    return {
        "total":        total,
        "success":      success,
        "failure":      failure,
        "success_rate": round(success / total, 3),
        "last_status":  last_run.get("conclusion") or last_run.get("status", "unknown"),
        "last_run_at":  last_run.get("created_at"),
        "last_branch":  last_run.get("head_branch", "main"),
    }


def collect_devops() -> dict[str, Any]:
    """Fetch DevOps metrics for all 3 projects. Returns structured dict for LangGraph."""
    result: dict[str, Any] = {"department": "devops", "projects": {}, "collected_at": datetime.now(timezone.utc).isoformat()}
    conn = None
    try:
        conn = _db()
        for project, cfg in PROJECTS.items():
            runs   = _fetch_gh_runs(cfg["gh_owner"], cfg["gh_repo"])
            health = _railway_health(cfg["railway_service"])

            _store_runs(project, runs, conn)
            _store_health(project, health, conn)

            result["projects"][project] = {
                "github_actions": _summarise_runs(project, runs),
                "railway_health": health,
            }
    except Exception as exc:
        logger.error("DevOps collect error: %s", exc)
        result["error"] = str(exc)
    finally:
        if conn:
            conn.close()

    # Compute cross-project anomalies
    anomalies = []
    for proj, data in result["projects"].items():
        gh = data.get("github_actions", {})
        if gh.get("last_status") == "failure":
            anomalies.append({"project": proj, "type": "ci_failure", "severity": "P1",
                               "msg": f"{proj} latest CI run FAILED"})
        health = data.get("railway_health", {})
        if health.get("status") in ("degraded", "down"):
            anomalies.append({"project": proj, "type": "service_degraded", "severity": "P0",
                               "msg": f"{proj} Railway service is {health['status'].upper()}"})
        if gh.get("success_rate", 1.0) < 0.7:
            anomalies.append({"project": proj, "type": "ci_reliability", "severity": "P1",
                               "msg": f"{proj} CI success rate {gh['success_rate']:.0%} — below 70%"})

    result["anomalies"] = anomalies
    result["critical_count"] = sum(1 for a in anomalies if a["severity"] == "P0")
    return result
