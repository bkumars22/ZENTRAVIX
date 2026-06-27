"""
Claude claude-sonnet-4-6 role-based summary generation for all 4 departments.

CEO:     2 sentences — business impact language, revenue/risk framing
Manager: bullet-point key metrics + anomalies flagged + recommended actions
Engineer: full technical detail — exact scores, model names, logs, fix suggestions
"""
from __future__ import annotations

import os
import json
import logging
from typing import Any

import anthropic

logger = logging.getLogger("zentravix.dept.summaries")

_client: anthropic.Anthropic | None = None

MODEL = "claude-sonnet-4-6"


def _claude() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _client


def _call(system: str, user: str, max_tokens: int = 400) -> str:
    try:
        msg = _claude().messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": user}],
            system=system,
        )
        return msg.content[0].text.strip()
    except Exception as exc:
        logger.error("Claude call failed: %s", exc)
        return f"Summary unavailable: {exc}"


# ── CEO ───────────────────────────────────────────────────────────────────────

CEO_SYSTEM = """You are ZENTRAVIX's AI executive assistant. Generate exactly 2 sentences for the CEO.
Sentence 1: overall platform health status and the single most important metric.
Sentence 2: the biggest risk or opportunity and the recommended executive action.
Use confident, direct business language. No technical jargon. No bullet points."""


def generate_ceo(dept: str, data: dict, anomalies: list[dict]) -> str:
    critical = [a for a in anomalies if a.get("severity") == "P0"]
    p1       = [a for a in anomalies if a.get("severity") == "P1"]
    prompt = f"""Department: {dept.upper()}
Critical P0 issues: {json.dumps(critical, default=str)[:800] if critical else "None"}
P1 warnings: {len(p1)}
Key data: {json.dumps(data, default=str)[:1200]}
Generate the 2-sentence CEO summary."""
    return _call(CEO_SYSTEM, prompt, max_tokens=120)


# ── Manager ───────────────────────────────────────────────────────────────────

MANAGER_SYSTEMS = {
    "devops": """You are the DevOps department AI analyst for ZENTRAVIX.
Summarise for the DevOps Manager covering: CI/CD pipeline health per project,
Railway service uptime, deployment frequency, and any failures.
Format: 3-5 bullet points. Each bullet = one key metric or action item.
Use percentages and counts. Flag any CI failures or service degradation clearly.""",

    "security": """You are the Security department AI analyst for ZENTRAVIX.
Summarise for the Security Manager covering: deepeval AI quality scores,
OWASP vulnerability counts by severity, and RBAC access denial spikes.
Format: 3-5 bullet points. Flag any CRITICAL vulnerabilities first.
Use exact scores. Recommend immediate actions for P0/P1 findings.""",

    "finance": """You are the Finance department AI analyst for ZENTRAVIX.
Summarise for the Finance Manager covering: AI API costs per project vs budget,
infrastructure costs, cost savings from ModelRouter, and any budget overruns.
Format: 3-5 bullet points with $ amounts and % of budget used.
Flag any project exceeding 80% of monthly budget.""",

    "product": """You are the Product department AI analyst for ZENTRAVIX.
Summarise for the Product Manager covering: ARIA student sessions and Socratic
compliance rate, QAIP pipeline success and defects found, SCIP supplier health
and IsolationForest anomalies.
Format: 3-5 bullet points. Highlight any product quality issues immediately.""",
}


def generate_manager(dept: str, data: dict, anomalies: list[dict]) -> str:
    system = MANAGER_SYSTEMS.get(dept, MANAGER_SYSTEMS["devops"])
    prompt = f"""Anomalies: {json.dumps(anomalies, default=str)[:600]}
Metrics: {json.dumps(data, default=str)[:2000]}
Generate the manager summary with 3-5 bullet points."""
    return _call(system, prompt, max_tokens=350)


# ── Engineer ──────────────────────────────────────────────────────────────────

ENGINEER_SYSTEMS = {
    "devops": """You are a senior DevOps engineer reviewing ZENTRAVIX platform health.
Provide a detailed technical summary covering:
- GitHub Actions run IDs, workflow names, exact failure reasons
- Railway service status, CPU/memory if available, response times
- Deployment version history and rollback recommendations if needed
- Specific fix steps for any CI failures (command-level suggestions)
Use technical detail. Include exact values. No fluff.""",

    "security": """You are a senior security engineer reviewing ZENTRAVIX platform security.
Provide a detailed technical summary covering:
- deepeval scores per metric per project (completeness, relevance, hallucination, structure, length)
- OWASP findings: exact category (A01, A03 etc.), severity, count, and recommended fix
- RBAC denied access patterns: which endpoints, which roles, frequency
- Specific remediation steps for each vulnerability (code-level suggestions where possible)
Be precise. Include threshold values. Flag false positives if apparent.""",

    "finance": """You are a senior platform engineer reviewing ZENTRAVIX AI and infra costs.
Provide a detailed technical summary covering:
- Per-project AI cost breakdown by model (llama-3.1-8b vs llama-3.3-70b vs llama-3.2-90b-vision)
- Cost savings from ModelRouter routing decisions (vs always-heavy baseline)
- Infrastructure cost by provider (Railway, GitHub, Groq, Anthropic)
- Daily cost trends and projected month-end spend
- Specific recommendations: task types to route to cheaper models, idle service checks""",

    "product": """You are a senior product engineer reviewing ZENTRAVIX platform product metrics.
Provide a detailed technical summary covering:
- ARIA: session count, score distribution, Socratic compliance rate per language,
  difficulty tier distribution, daily trend
- QAIP: pipeline run count, success rate, gap_count total, deepeval averages per project,
  defects found and P0 count — which pipeline triggered which finding
- SCIP: total supplier count, health breakdown (healthy/at_risk/critical),
  IsolationForest anomaly details (supplier names, risk scores, reasons)
Include exact numbers. Suggest specific investigation steps for anomalies.""",
}


def generate_engineer(dept: str, data: dict, anomalies: list[dict]) -> str:
    system = ENGINEER_SYSTEMS.get(dept, ENGINEER_SYSTEMS["devops"])
    prompt = f"""Full data snapshot:
{json.dumps(data, default=str)[:3000]}

Anomalies detected:
{json.dumps(anomalies, default=str)[:800]}

Generate the detailed engineer technical summary."""
    return _call(system, prompt, max_tokens=600)
