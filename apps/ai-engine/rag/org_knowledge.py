"""ZENTRAVIX org knowledge seeder.

Seeds the pgvector knowledge base from the SEEDED_DATA dict and any
live data pushed via /rag/ingest. Called on startup and on every
QAIP webhook event so the knowledge base always reflects reality.

Domains:
  project    — SCIP, ARIA health scores, QAIP pass rates, sprint velocity
  sprint     — individual sprint data
  financial  — revenue, burn rate, budget
  hr         — headcount, hiring pipeline
  sales      — CRM pipeline, deals, customer health
  alert      — active AI alerts (P0 bugs, anomalies)
"""

from __future__ import annotations

import logging
from typing import Any

from .embedder import embed
from .vector_store import upsert_knowledge, ensure_schema

logger = logging.getLogger("rag.org_knowledge")


def _ingest(domain: str, entity_id: str, content: str, metadata: dict[str, Any]) -> bool:
    try:
        embedding = embed(content)
        result = upsert_knowledge(
            content=content,
            embedding=embedding,
            domain=domain,
            entity_id=entity_id,
            metadata=metadata,
        )
        return result is not None
    except Exception as exc:
        logger.warning("org_knowledge ingest failed [%s/%s]: %s", domain, entity_id, exc)
        return False


def seed_from_data(seeded_data: dict[str, Any]) -> int:
    """Seed all knowledge chunks from the SEEDED_DATA dict. Returns count ingested."""
    ensure_schema()
    count = 0

    # ── Projects ──────────────────────────────────────────────────────────────
    for key, proj in seeded_data.get("projects", {}).items():
        content = (
            f"Project: {proj.get('name', key)}\n"
            f"Health score: {proj.get('healthScore', 0)}/100\n"
            f"QAIP pass rate: {proj.get('qaipPassRate', 0):.1f}%\n"
            f"Open P0 defects: {proj.get('openP0s', 0)}\n"
            f"P0 count: {proj.get('qaipP0Count', 0)}\n"
            f"Total defects: {proj.get('qaipDefects', 0)}\n"
            f"Sprint velocity: {proj.get('velocity', 0)} points\n"
            f"Current sprint: #{proj.get('sprintNumber', 0)}\n"
            f"Release date: {proj.get('releaseDate', 'TBD')}\n"
            f"Status: {'BLOCKED — P0 open' if proj.get('openP0s', 0) > 0 else 'ON TRACK'}"
        )
        ok = _ingest("project", f"project:{key}", content, proj)
        if ok:
            count += 1

    # ── Financial ─────────────────────────────────────────────────────────────
    revenue = seeded_data.get("revenue", {})
    if revenue:
        current = revenue.get("current", 0)
        target = revenue.get("target", 1)
        pct = current / target * 100 if target else 0
        content = (
            f"Revenue: Rs.{current/1e7:.1f}Cr of Rs.{target/1e7:.1f}Cr target ({pct:.0f}% achieved)\n"
            f"Month-on-month growth: {revenue.get('mom', 0)}%\n"
            f"Status: {'AT RISK — below 90%' if pct < 90 else 'ON TRACK'}"
        )
        ok = _ingest("financial", "revenue:current", content, revenue)
        if ok:
            count += 1

    burn = seeded_data.get("burnRate", {})
    if burn:
        content = (
            f"Monthly burn rate: Rs.{burn.get('monthly', 0)/1e7:.1f}Cr\n"
            f"Runway: {burn.get('runwayMonths', 0)} months at current burn\n"
        )
        ok = _ingest("financial", "burnrate:current", content, burn)
        if ok:
            count += 1

    # ── HR / Headcount ────────────────────────────────────────────────────────
    hc = seeded_data.get("headcount", {})
    if hc:
        content = (
            f"Current headcount: {hc.get('current', 0)} of {hc.get('planned', 0)} planned\n"
            f"Open roles: {hc.get('planned', 0) - hc.get('current', 0)}\n"
        )
        ok = _ingest("hr", "headcount:current", content, hc)
        if ok:
            count += 1

    # ── NPS / Customer ────────────────────────────────────────────────────────
    nps = seeded_data.get("nps", {})
    if nps:
        content = (
            f"Organisation NPS: {nps.get('current', 0)} (last month: {nps.get('lastMonth', 0)})\n"
            f"Change: {nps.get('current', 0) - nps.get('lastMonth', 0):+d} points\n"
        )
        ok = _ingest("sales", "nps:current", content, nps)
        if ok:
            count += 1

    logger.info("Seeded %d knowledge chunks from SEEDED_DATA", count)
    return count


def ingest_project_update(
    project_key: str,
    project_name: str,
    health_score: int,
    qaip_pass_rate: float,
    open_p0s: int,
    velocity: int,
    sprint_number: int,
    release_date: str,
    extra: dict[str, Any] | None = None,
) -> bool:
    """Update a single project's knowledge chunk (called on QAIP webhook)."""
    content = (
        f"Project: {project_name}\n"
        f"Health score: {health_score}/100\n"
        f"QAIP pass rate: {qaip_pass_rate:.1f}%\n"
        f"Open P0 defects: {open_p0s}\n"
        f"Sprint velocity: {velocity} points\n"
        f"Current sprint: #{sprint_number}\n"
        f"Release date: {release_date}\n"
        f"Status: {'BLOCKED — P0 open' if open_p0s > 0 else 'ON TRACK'}"
    )
    metadata: dict[str, Any] = {
        "project_key": project_key,
        "health_score": health_score,
        "qaip_pass_rate": qaip_pass_rate,
        "open_p0s": open_p0s,
        "velocity": velocity,
        "sprint_number": sprint_number,
        "release_date": release_date,
        **(extra or {}),
    }
    return _ingest("project", f"project:{project_key}", content, metadata)


def ingest_alert(
    alert_id: str,
    severity: str,
    message: str,
    action_needed: str,
    category: str,
    project_key: str = "",
) -> bool:
    """Store an AI alert so the CEO can query 'what alerts are active?'."""
    content = (
        f"Alert [{severity}]: {message}\n"
        f"Category: {category}\n"
        f"Action required: {action_needed}\n"
    )
    if project_key:
        content = f"Project: {project_key}\n" + content

    metadata: dict[str, Any] = {
        "alert_id": alert_id,
        "severity": severity,
        "category": category,
        "project_key": project_key,
    }
    return _ingest("alert", f"alert:{alert_id}", content, metadata)
