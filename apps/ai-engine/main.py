from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

from agents.intelligence import run_intelligence, ROLE_SUMMARIES

app = FastAPI(title="AURANEX AI Engine", version="1.0.0")

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
    return {"status": "ok", "service": "AURANEX AI Engine", "version": "1.0.0"}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
