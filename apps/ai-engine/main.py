from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import os
import logging
from dotenv import load_dotenv

load_dotenv()

from agents.intelligence import run_intelligence, ROLE_SUMMARIES, SEEDED_DATA
from model_router import get_router, MODEL_REGISTRY, TASK_TIER_MAP, ModelTier
from cost_tracker import record as track_cost, dashboard as cost_dashboard

_router = get_router("ZENTRAVIX")

logger = logging.getLogger("zentravix.main")

app = FastAPI(title="ZENTRAVIX AI Engine", version="1.0.0")


def _do_seed():
    """Seed/refresh org knowledge in pgvector."""
    try:
        from rag.org_knowledge import seed_from_data
        count = seed_from_data(SEEDED_DATA)
        logger.info("ZENTRAVIX: seeded/refreshed %d knowledge chunks", count)
    except Exception as exc:
        logger.warning("ZENTRAVIX knowledge seed failed (non-fatal): %s", exc)


DEPARTMENTS = ["devops", "security", "finance", "product"]


def _run_all_departments():
    """Run all 4 department LangGraph pipelines sequentially."""
    from departments.langgraph_pipeline import run_department
    for dept in DEPARTMENTS:
        try:
            run_department(dept)
        except Exception as exc:
            logger.error("Department pipeline error [%s]: %s", dept, exc)


@app.on_event("startup")
def _startup():
    """Seed RAG, start 15-min department refresh scheduler."""
    _do_seed()
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        sched = BackgroundScheduler()
        sched.add_job(_do_seed,              "interval", minutes=15, id="zentravix_seed")
        sched.add_job(_run_all_departments,  "interval", minutes=15, id="zentravix_depts",
                      coalesce=True, max_instances=1)
        sched.start()
        logger.info("ZENTRAVIX: scheduler started — RAG seed + dept refresh every 15 min")
    except ImportError:
        logger.warning("apscheduler not installed — auto re-indexing disabled")

VALID_ROLES = {"CEO", "EXECUTIVE", "VP", "MANAGER", "LEAD", "SENIOR", "JUNIOR"}


class QueryRequest(BaseModel):
    question: str
    user_role: str


class QueryResponse(BaseModel):
    answer: str
    role: str


class AlertsResponse(BaseModel):
    role: str
    alerts: list


class SummaryResponse(BaseModel):
    role: str
    summary: str
    generatedAt: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "ZENTRAVIX AI Engine", "version": "1.0.0"}


@app.post("/ai/query", response_model=QueryResponse)
def query(body: QueryRequest):
    role = body.user_role.upper()
    if role not in VALID_ROLES:
        role = "JUNIOR"

    try:
        result = run_intelligence(role=role, question=body.question)
        answer = result.get("answer") or "No answer available."
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return QueryResponse(answer=answer, role=role)


@app.post("/ai/run-analysis")
def run_analysis():
    results = {}
    for role in VALID_ROLES:
        try:
            result = run_intelligence(role=role)
            results[role] = {
                "anomalies": result.get("anomalies", []),
                "alertCount": len(result.get("alerts", [])),
            }
        except Exception as e:
            results[role] = {"error": str(e)}
    return {"status": "completed", "roles_processed": list(VALID_ROLES), "results": results}


@app.get("/ai/alerts/{role}", response_model=AlertsResponse)
def get_alerts(role: str):
    role = role.upper()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    try:
        result = run_intelligence(role=role)
        alerts = result.get("alerts", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return AlertsResponse(role=role, alerts=alerts)


@app.get("/ai/summary/{role}", response_model=SummaryResponse)
def get_summary(role: str):
    from datetime import datetime, timezone

    role = role.upper()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    summary = ROLE_SUMMARIES.get(role, "Summary not available for this role.")

    return SummaryResponse(
        role=role,
        summary=summary,
        generatedAt=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# RAG endpoints
# ---------------------------------------------------------------------------

class RagIngestRequest(BaseModel):
    domain: str
    entity_id: str
    content: str
    metadata: dict[str, Any] = {}


class RagQueryRequest(BaseModel):
    question: str
    domain: Optional[str] = None
    top_k: int = 6


class ProjectUpdateRequest(BaseModel):
    project_key: str
    project_name: str
    health_score: int
    qaip_pass_rate: float
    open_p0s: int
    velocity: int
    sprint_number: int
    release_date: str


@app.post("/rag/ingest")
def rag_ingest(payload: RagIngestRequest):
    """Ingest an org knowledge document directly."""
    try:
        from rag.embedder import embed
        from rag.vector_store import upsert_knowledge, ensure_schema
        ensure_schema()
        embedding = embed(payload.content)
        doc_id = upsert_knowledge(
            content=payload.content,
            embedding=embedding,
            domain=payload.domain,
            entity_id=payload.entity_id,
            metadata=payload.metadata,
        )
        return {"status": "ok", "id": doc_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/rag/query")
def rag_query(payload: RagQueryRequest):
    """Natural-language search over ZENTRAVIX org knowledge."""
    try:
        from rag.embedder import embed
        from rag.vector_store import search_knowledge
        q_embed = embed(payload.question)
        results = search_knowledge(
            query_embedding=q_embed,
            top_k=payload.top_k,
            domain=payload.domain,
        )
        return {"results": results, "count": len(results)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/rag/project-update")
def rag_project_update(payload: ProjectUpdateRequest):
    """Update a single project's knowledge entry (called by QAIP webhook)."""
    try:
        from rag.org_knowledge import ingest_project_update
        ok = ingest_project_update(
            project_key=payload.project_key,
            project_name=payload.project_name,
            health_score=payload.health_score,
            qaip_pass_rate=payload.qaip_pass_rate,
            open_p0s=payload.open_p0s,
            velocity=payload.velocity,
            sprint_number=payload.sprint_number,
            release_date=payload.release_date,
        )
        return {"status": "ok" if ok else "failed"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Level 4 — Cross-Project Cost Dashboard (platform hub, GAP 2 + GAP 6)
# ---------------------------------------------------------------------------

@app.get("/platform/cost-dashboard")
def platform_cost_dashboard():
    """
    Cross-project cost dashboard — shows AI spend for QAIP, SCIP, ARIA, ZENTRAVIX.
    This is the single pane of glass for AI cost visibility across the platform.
    """
    all_data = cost_dashboard()   # all projects
    return {
        "platform":    "ZENTRAVIX",
        "description": "Cross-project AI cost dashboard — all 4 products",
        **all_data,
    }


@app.get("/platform/model-registry")
def platform_model_registry():
    """
    Shared model registry used by all projects on the ZENTRAVIX platform.
    Defines routing rules, costs, and capabilities for every AI model.
    """
    return {
        "platform": "ZENTRAVIX",
        "models": {
            tier.value: {
                "model_id": spec.model_id,
                "provider": spec.provider,
                "cost_per_1m_input":  spec.cost_per_1m_input,
                "cost_per_1m_output": spec.cost_per_1m_output,
                "max_tokens": spec.max_tokens,
                "avg_latency_ms": spec.avg_latency_ms,
            }
            for tier, spec in MODEL_REGISTRY.items()
        },
        "task_routing": {task: tier.value for task, tier in TASK_TIER_MAP.items()},
        "projects_using": ["QAIP", "SCIP", "ARIA", "ZENTRAVIX"],
    }


@app.get("/platform/projects")
def platform_projects():
    """
    ZENTRAVIX platform hub — lists all connected AI products with purpose and status.
    """
    return {
        "platform": "ZENTRAVIX",
        "tagline":  "Multi-product AI platform orchestrating QA, Supply Chain, Education, and Org Intelligence",
        "projects": [
            {
                "key":     "QAIP",
                "name":    "QA Intelligent Platform",
                "purpose": "AI-driven software quality — automated test generation, defect detection, risk scoring",
                "advantages": [
                    "84% cost reduction via ModelRouter vs always-Claude-Opus",
                    "LangGraph multi-agent pipeline (Risk → Coverage → TestGen → Defect → Explain → Dispatch)",
                    "Live GitHub PR analysis in < 90 seconds",
                    "IsolationForest ML anomaly detection on commit history",
                ],
                "status": "LIVE",
                "url":    "https://bkumars22.github.io/TestMind",
                "level":  "AI Engineer → AI Architect (Level 3→4)",
            },
            {
                "key":     "SCIP",
                "name":    "Supply Chain Intelligence Platform",
                "purpose": "End-to-end B2B procurement automation — PO lifecycle, supplier risk, invoice matching, demand forecasting",
                "advantages": [
                    "50+ domain modules (PO, invoice, inventory, logistics, compliance, contract, BOM)",
                    "AI-powered supplier risk scoring and demand forecasting",
                    "IsolationForest anomaly detection on procurement patterns",
                    "Full procure-to-pay automation from requisition to payment",
                ],
                "status": "LIVE",
                "url":    "https://bkumars22.github.io/scweb",
                "level":  "AI Engineer (Level 3)",
            },
            {
                "key":     "ARIA",
                "name":    "Adaptive Real-time Intelligent Assistant (Education)",
                "purpose": "AI teacher for students aged 4–18 — Socratic teaching, homework solving, 25-language support, vision-based document explanation",
                "advantages": [
                    "Socratic engine never gives direct answers — forces student thinking",
                    "Adaptive difficulty — adjusts automatically at score thresholds (35% / 80%)",
                    "25-language support including 10 Indian regional languages",
                    "Vision model reads photos of homework/textbook pages",
                    "Parent reports generated in parent's native language",
                ],
                "status": "LIVE",
                "url":    "https://bkumars22.github.io/ARIA",
                "level":  "AI Engineer → AI Architect (Level 3→4)",
            },
            {
                "key":     "ZENTRAVIX",
                "name":    "ZENTRAVIX Organisation Intelligence Platform",
                "purpose": "CEO/VP/Manager/Individual role-based dashboards fed by real-time AI — connects all 3 products into one executive intelligence layer",
                "advantages": [
                    "Role-aware AI — CEO sees strategic risk, VP sees delivery metrics, Manager sees team health",
                    "Pulls live data from QAIP (test quality), SCIP (supply risk), ARIA (learning outcomes)",
                    "pgvector RAG over org knowledge base — answers natural-language org questions",
                    "Cross-project cost dashboard — single view of AI spend across all products",
                    "Shared ModelRouter — platform-level model routing and cost optimisation",
                ],
                "status": "BUILDING",
                "level":  "AI Architect → AI Principal (Level 4→5)",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Department Intelligence Endpoints
# ---------------------------------------------------------------------------

class DeptRefreshResponse(BaseModel):
    department: str
    status:     str
    snapshot_id: str
    critical_count: int
    anomaly_count:  int


@app.get("/dept/{department}/snapshot")
def dept_snapshot(department: str):
    """Return the latest cached snapshot for a department (Redis → DB fallback)."""
    if department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Unknown department: {department}. Valid: {DEPARTMENTS}")
    from departments.langgraph_pipeline import get_cached_snapshot
    cached = get_cached_snapshot(department)
    if cached:
        return {"source": "cache", **cached}
    raise HTTPException(status_code=404, detail=f"No snapshot available for {department} — trigger /dept/{department}/refresh first")


@app.post("/dept/{department}/refresh", response_model=DeptRefreshResponse)
def dept_refresh(department: str):
    """Trigger an immediate LangGraph pipeline run for the given department."""
    if department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Unknown department: {department}. Valid: {DEPARTMENTS}")
    from departments.langgraph_pipeline import run_department
    result = run_department(department)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return DeptRefreshResponse(
        department=department,
        status="refreshed",
        snapshot_id=result.get("snapshot_id", ""),
        critical_count=result.get("critical_count", 0),
        anomaly_count=len(result.get("anomalies", [])),
    )


@app.post("/dept/refresh-all")
def dept_refresh_all():
    """Trigger all 4 department pipelines immediately (blocking)."""
    results = {}
    for dept in DEPARTMENTS:
        from departments.langgraph_pipeline import run_department
        r = run_department(dept)
        results[dept] = {
            "critical_count": r.get("critical_count", 0),
            "anomaly_count":  len(r.get("anomalies", [])),
            "error":          r.get("error"),
        }
    return {"status": "completed", "departments": results}


@app.get("/dept/{department}/alerts")
def dept_alerts(department: str, severity: str = "P0"):
    """Return unresolved alerts for a department at or above given severity."""
    import psycopg2, psycopg2.extras
    severities = {"P0": ["P0"], "P1": ["P0", "P1"], "P2": ["P0", "P1", "P2"]}
    allowed = severities.get(severity.upper(), ["P0"])
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL", ""))
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM dept_alerts
                WHERE department = %s AND severity = ANY(%s) AND resolved_at IS NULL
                ORDER BY created_at DESC LIMIT 50
                """,
                (department, allowed),
            )
            rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return {"department": department, "severity_filter": severity, "alerts": rows, "count": len(rows)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
