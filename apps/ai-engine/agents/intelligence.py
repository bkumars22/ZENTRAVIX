from typing import TypedDict, List, Dict, Any
import os
import json
import redis as redis_lib

try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


class AgentState(TypedDict):
    role: str
    question: str
    raw_data: Dict[str, Any]
    anomalies: List[str]
    alerts: List[Dict[str, Any]]
    summaries: Dict[str, str]
    answer: str
    cache_key: str


SEEDED_DATA = {
    "projects": {
        "SCIP": {
            "name": "SCIP",
            "healthScore": 87,
            "qaipPassRate": 95.7,
            "qaipDefects": 3,
            "qaipP0Count": 1,
            "velocity": 42,
            "sprintNumber": 12,
            "openP0s": 1,
            "releaseDate": "2026-07-15",
        },
        "ARIA": {
            "name": "ARIA",
            "healthScore": 94,
            "qaipPassRate": 98.6,
            "qaipDefects": 1,
            "qaipP0Count": 0,
            "velocity": 38,
            "sprintNumber": 8,
            "openP0s": 0,
            "releaseDate": "2026-07-01",
        },
    },
    "revenue": {"current": 42000000, "target": 50000000, "mom": 12},
    "burnRate": {"monthly": 18000000, "runwayMonths": 14},
    "headcount": {"current": 142, "planned": 150},
    "nps": {"current": 67, "lastMonth": 63},
}

KNOWLEDGE_BASE = [
    {
        "keywords": ["scip", "delay", "block", "p0", "bug", "issue"],
        "answer": (
            "SCIP Sprint #12 has 1 open P0 bug in the auth module, unresolved for 48 hours. "
            "Release gated until P0 resolved. Current velocity dropped from 46 to 42 this sprint. "
            "Recommended action: assign senior developer immediately and run daily standups."
        ),
    },
    {
        "keywords": ["aria", "status", "ready", "release"],
        "answer": (
            "ARIA v1.8.0 is on track for the July 1 release. Test coverage at 98.6%, "
            "pass rate 98.6%, 0 P0 issues. Socratic engine validated. Release readiness: CONFIRMED."
        ),
    },
    {
        "keywords": ["sales", "pipeline", "revenue", "q3"],
        "answer": (
            "Current pipeline at 2.3x coverage against Q3 target of Rs.5Cr. "
            "3 deals in final stages worth Rs.2.1Cr: TechCorp Enterprise (Rs.1.2Cr, 80%), "
            "GlobalRetail Platform (Rs.85L, 60%). Pipeline below 3x threshold — at risk."
        ),
    },
    {
        "keywords": ["burn", "budget", "runway"],
        "answer": (
            "Current monthly burn: Rs.1.8Cr. Runway: 14 months at current rate. "
            "Technology spend Rs.5.2Cr of Rs.8Cr budget (65% utilised). "
            "Cloud spend trajectory projects Q4 overage of Rs.12L — recommend review."
        ),
    },
    {
        "keywords": ["nps", "customer", "health", "satisfaction"],
        "answer": (
            "Organisation NPS: 67 (up from 63 last month, +4 pts). "
            "TechCorp 85/100, GlobalRetail 72/100 (churn risk 18%), StartupXYZ 90/100. "
            "1 SLA breach open at GlobalRetail."
        ),
    },
    {
        "keywords": ["headcount", "hiring", "team"],
        "answer": (
            "Current headcount: 142 of 150 planned. 8 open roles, 12 in interviews, 3 offers pending. "
            "Technology: 47 (Engineering 32, QA 8, DevOps 7)."
        ),
    },
    {
        "keywords": ["velocity", "sprint", "scrum"],
        "answer": (
            "SCIP Sprint #12 velocity: 42 (down from 46 Sprint #10). "
            "Commitment: 50 points, completed: 32 (64%). 3 developers blocked. "
            "AI prediction: 8 points will not complete — recommend scope reduction."
        ),
    },
]

ROLE_SUMMARIES = {
    "CEO": (
        "Executive Summary — Organisation health: Revenue Rs.4.2Cr of Rs.5Cr target (84%). "
        "Burn Rs.1.8Cr/month, 14-month runway. NPS 67 (+4 pts). "
        "CRITICAL: SCIP release blocked by P0 auth bug (48hrs). "
        "ARIA v1.8.0 release confirmed for July 1 — 98.6% pass rate. "
        "Headcount 142/150. Sales pipeline at 2.3x — below 3x threshold."
    ),
    "VP": (
        "VP Engineering Summary — Technology spend Rs.5.2Cr/Rs.8Cr (65%). "
        "Team capacity 82.6% committed. SCIP Sprint #12 velocity 42 (below baseline). "
        "ARIA Sprint #8 on track. Hiring: 8 open, 12 interviews, 3 offers. "
        "QAIP: SCIP 95.7%, ARIA 98.6%. Cloud spend forecasts Q4 overage of Rs.12L."
    ),
    "EXECUTIVE": (
        "VP Engineering Summary — Technology spend Rs.5.2Cr/Rs.8Cr (65%). "
        "Team capacity 82.6% committed. SCIP Sprint #12 velocity 42. "
        "ARIA Sprint #8 on track. Cloud spend forecasts Q4 overage of Rs.12L."
    ),
    "MANAGER": (
        "Manager Summary — Sprint #12: 32/50 points (64%), 3 days remaining. "
        "8 points at risk. 3 developers blocked on platform dependency. "
        "Priya Singh has 3 PRs open >48hrs — needs reviewers. "
        "Arjun Patel blocked on P0 fix — critical path item."
    ),
    "SENIOR": (
        "Developer Summary — 2 PRs open. Sprint #12 ahead of personal velocity. "
        "ARIA test suite completed. API rate limiting in progress. Good trajectory."
    ),
    "LEAD": (
        "Lead Summary — Team velocity within range. 1 blocked team member. "
        "PR review backlog building — action needed."
    ),
    "JUNIOR": (
        "QA Summary — Your QAIP run: 94.2% pass rate (below 95% threshold). "
        "2 defects found (1 P2, 1 P3). P0 auth bypass task is critical — prioritise today. "
        "Timesheet 32/40 hours — submit by end of week."
    ),
}


def collect_data(state: AgentState) -> AgentState:
    state["raw_data"] = SEEDED_DATA
    return state


def detect_anomalies(state: AgentState) -> AgentState:
    anomalies = []
    data = state["raw_data"]

    scip = data["projects"].get("SCIP", {})
    if scip.get("openP0s", 0) > 0:
        anomalies.append(f"SCIP has {scip['openP0s']} open P0(s) — release gate active")
    if scip.get("velocity", 0) < 44:
        anomalies.append("SCIP velocity below 8-sprint average of 44.6")

    revenue = data.get("revenue", {})
    if revenue.get("current", 0) / max(revenue.get("target", 1), 1) < 0.90:
        anomalies.append("Revenue tracking below 90% of target")

    state["anomalies"] = anomalies
    return state


def generate_alerts(state: AgentState) -> AgentState:
    alerts = []
    for anomaly in state["anomalies"]:
        severity = "CRITICAL" if "P0" in anomaly else "WARNING"
        alerts.append({"severity": severity, "message": anomaly, "category": "AI-detected"})
    state["alerts"] = alerts
    return state


def generate_summaries(state: AgentState) -> AgentState:
    state["summaries"] = ROLE_SUMMARIES
    return state


def answer_question(state: AgentState) -> AgentState:
    question = (state.get("question") or "").lower()

    for kb in KNOWLEDGE_BASE:
        if any(kw in question for kw in kb["keywords"]):
            state["answer"] = kb["answer"]
            return state

    role = state.get("role", "")
    summary = ROLE_SUMMARIES.get(role, "")
    state["answer"] = (
        f"Based on current ZENTRAVIX data: your question about '{state.get('question', '')[:60]}' "
        "requires analysis beyond the current knowledge base. "
        + (f"Context for your role: {summary}" if summary else "")
    )
    return state


def update_cache(state: AgentState) -> AgentState:
    try:
        r = redis_lib.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        cache_key = state.get("cache_key") or f"ZENTRAVIX:summary:{state.get('role', 'all')}"
        r.setex(cache_key, 300, json.dumps({"summaries": state["summaries"], "alerts": state["alerts"]}))
    except Exception:
        pass
    return state


def build_graph():
    if not LANGGRAPH_AVAILABLE:
        return None

    builder = StateGraph(AgentState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("detect_anomalies", detect_anomalies)
    builder.add_node("generate_alerts", generate_alerts)
    builder.add_node("generate_summaries", generate_summaries)
    builder.add_node("answer_question", answer_question)
    builder.add_node("update_cache", update_cache)

    builder.set_entry_point("collect_data")
    builder.add_edge("collect_data", "detect_anomalies")
    builder.add_edge("detect_anomalies", "generate_alerts")
    builder.add_edge("generate_alerts", "generate_summaries")
    builder.add_edge("generate_summaries", "answer_question")
    builder.add_edge("answer_question", "update_cache")
    builder.add_edge("update_cache", END)

    return builder.compile()


intelligence_graph = build_graph()


def run_intelligence(role: str, question: str = "") -> AgentState:
    initial_state: AgentState = {
        "role": role,
        "question": question,
        "raw_data": {},
        "anomalies": [],
        "alerts": [],
        "summaries": {},
        "answer": "",
        "cache_key": f"ZENTRAVIX:intelligence:{role}",
    }

    if intelligence_graph:
        return intelligence_graph.invoke(initial_state)

    state = collect_data(initial_state)
    state = detect_anomalies(state)
    state = generate_alerts(state)
    state = generate_summaries(state)
    state = answer_question(state)
    state = update_cache(state)
    return state
