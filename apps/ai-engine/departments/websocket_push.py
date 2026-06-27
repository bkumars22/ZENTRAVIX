"""
WebSocket push bridge — publishes dept snapshots and critical alerts to Redis pub/sub.
The Node.js API (apps/api) subscribes to these channels and broadcasts via Socket.io.

Channels:
  zentravix:dept:{dept}:snapshot  — full snapshot every 15 min
  zentravix:alert:critical        — P0/P1 alerts immediately
"""
from __future__ import annotations

import os
import json
import logging
from datetime import datetime, timezone

import redis as redis_lib

logger = logging.getLogger("zentravix.dept.ws_push")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_pub: redis_lib.Redis | None = None


def _get_pub() -> redis_lib.Redis:
    global _pub
    if _pub is None:
        _pub = redis_lib.from_url(REDIS_URL, decode_responses=True)
    return _pub


def push_snapshot(department: str, payload: dict) -> None:
    channel = f"zentravix:dept:{department}:snapshot"
    try:
        msg = json.dumps({"event": f"dept:{department}:update", "data": payload, "ts": datetime.now(timezone.utc).isoformat()})
        subs = _get_pub().publish(channel, msg)
        logger.info("Pushed %s snapshot → %d subscriber(s)", department.upper(), subs)
    except Exception as exc:
        logger.error("Redis publish failed for %s: %s", department, exc)


def push_critical_alert(department: str, alert: dict) -> None:
    channel = "zentravix:alert:critical"
    try:
        msg = json.dumps({
            "event": "dept:alert:critical",
            "data":  {**alert, "department": department, "ts": datetime.now(timezone.utc).isoformat()},
        })
        subs = _get_pub().publish(channel, msg)
        logger.warning("CRITICAL ALERT pushed [%s] %s → %d subscriber(s)",
                        alert.get("severity"), alert.get("msg"), subs)
    except Exception as exc:
        logger.error("Redis critical alert publish failed: %s", exc)
