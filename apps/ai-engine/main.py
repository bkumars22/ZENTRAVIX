from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
import os
import logging
from dotenv import load_dotenv

load_dotenv()

from agents.intelligence import run_intelligence, ROLE_SUMMARIES, SEEDED_DATA

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


@app.on_event("startup")
def _startup():
    """Seed on startup and schedule periodic refresh every 15 minutes."""
    _do_seed()
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        sched = BackgroundScheduler()
        sched.add_job(_do_seed, "interval", minutes=15, id="zentravix_seed")
        sched.start()
        logger.info("ZENTRAVIX: scheduler started — re-indexing every 15 minutes")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
