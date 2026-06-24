"""pgvector-backed org knowledge store for ZENTRAVIX RAG.

Stores org knowledge chunks (projects, sprints, QAIP reports, financials,
HR data). The answer_question node retrieves the most relevant chunks
and feeds them to Claude instead of using keyword matching.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import psycopg2
import psycopg2.extras

logger = logging.getLogger("rag.vector_store")

_DDL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS zentravix_knowledge (
    id          BIGSERIAL PRIMARY KEY,
    content     TEXT        NOT NULL,
    embedding   vector(384),
    metadata    JSONB       DEFAULT '{}',
    domain      VARCHAR(50),
    entity_id   VARCHAR(255),
    updated_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS zentravix_knowledge_domain_idx
    ON zentravix_knowledge (domain);

CREATE INDEX IF NOT EXISTS zentravix_knowledge_embedding_idx
    ON zentravix_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);
"""

_DB_URL = os.getenv("DATABASE_URL", "")


def _conn():
    if not _DB_URL:
        raise RuntimeError("DATABASE_URL not set — pgvector store unavailable")
    try:
        from pgvector.psycopg2 import register_vector
        c = psycopg2.connect(_DB_URL)
        register_vector(c)
        return c
    except ImportError:
        return psycopg2.connect(_DB_URL)


def ensure_schema() -> bool:
    try:
        with _conn() as c:
            with c.cursor() as cur:
                cur.execute(_DDL)
        logger.info("ZENTRAVIX knowledge schema ready")
        return True
    except Exception as exc:
        logger.warning("Schema setup failed: %s", exc)
        return False


def upsert_knowledge(
    content: str,
    embedding: list[float],
    domain: str,
    entity_id: str,
    metadata: dict[str, Any] | None = None,
) -> int | None:
    vec_str = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"
    sql = """
        INSERT INTO zentravix_knowledge (content, embedding, metadata, domain, entity_id, updated_at)
        VALUES (%s, %s::vector, %s::jsonb, %s, %s, NOW())
        ON CONFLICT (entity_id)
        DO UPDATE SET content = EXCLUDED.content,
                      embedding = EXCLUDED.embedding,
                      metadata = EXCLUDED.metadata,
                      updated_at = NOW()
        RETURNING id
    """
    try:
        with _conn() as c:
            with c.cursor() as cur:
                # Add unique constraint if not exists
                cur.execute("""
                    DO $$ BEGIN
                        ALTER TABLE zentravix_knowledge ADD CONSTRAINT zentravix_knowledge_entity_id_unique UNIQUE (entity_id);
                    EXCEPTION WHEN duplicate_table THEN NULL;
                    WHEN others THEN NULL;
                    END $$
                """)
                cur.execute(sql, (content, vec_str, json.dumps(metadata or {}), domain, entity_id))
                row = cur.fetchone()
                return row[0] if row else None
    except Exception as exc:
        logger.warning("upsert_knowledge failed: %s", exc)
        return None


def search_knowledge(
    query_embedding: list[float],
    top_k: int = 6,
    domain: str | None = None,
    min_similarity: float = 0.25,
) -> list[dict[str, Any]]:
    vec_str = "[" + ",".join(f"{v:.6f}" for v in query_embedding) + "]"
    domain_clause = "AND domain = %s" if domain else ""
    params: list[Any] = [vec_str]
    if domain:
        params.append(domain)
    params += [vec_str, top_k]

    sql = f"""
        SELECT content, metadata, domain,
               1 - (embedding <=> %s::vector) AS similarity
        FROM   zentravix_knowledge
        WHERE  embedding IS NOT NULL {domain_clause}
        ORDER  BY embedding <=> %s::vector
        LIMIT  %s
    """
    try:
        with _conn() as c:
            with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        return [
            {
                "content": r["content"],
                "metadata": r["metadata"] if isinstance(r["metadata"], dict) else json.loads(r["metadata"] or "{}"),
                "domain": r["domain"],
                "similarity": round(float(r["similarity"]), 4),
            }
            for r in rows
            if float(r["similarity"]) >= min_similarity
        ]
    except Exception as exc:
        logger.warning("search_knowledge failed: %s", exc)
        return []
