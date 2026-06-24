# ZENTRAVIX — Organisation Intelligence Platform

**From Junior Developer to CEO — Every Role, Every Department, One Platform**

ZENTRAVIX integrates SCIP (Supply Chain AI), ARIA (AI Tutor), and QAIP (QA Intelligent Platform) into a single enterprise intelligence layer. Every metric — from QAIP test pass rates to Sales pipeline — flows into role-specific dashboards in real time. Now powered by RAG: ask any question and get answers from real org data.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6366f1?style=for-the-badge)](https://bkumars22.github.io/ZENTRAVIX)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![RAG](https://img.shields.io/badge/RAG-pgvector%20%2B%20Claude-8b5cf6?style=for-the-badge)](https://github.com/bkumars22/ZENTRAVIX)
[![Claude](https://img.shields.io/badge/AI-Claude%20Sonnet%204-ff6b35?style=for-the-badge)](https://anthropic.com)

Author: B KumaraSwamy | swamy.kumar02@gmail.com | Bangalore | 2026

---

## Live Access

**https://bkumars22.github.io/ZENTRAVIX**

> Runs in **demo mode** — no backend required. Sign in and all 4 dashboard layers work immediately.

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| CEO | ceo@zentravix.io | Zentravix@2026 | CEO Executive — revenue, burn, NPS, AI alerts |
| CTO | cto@zentravix.io | Zentravix@2026 | VP Engineering — projects, velocity, releases |
| CFO | cfo@zentravix.io | Zentravix@2026 | VP Finance — budget, spend, forecast |
| VP Engineering | vp.eng@zentravix.io | Zentravix@2026 | VP Dashboard — 5 tabs with QAIP scores |
| Engineering Manager | manager@zentravix.io | Zentravix@2026 | Manager — Kanban, team health, AI standup |
| Senior Developer | senior.dev@zentravix.io | Zentravix@2026 | Individual — tasks, PRs, metrics |
| QA Engineer | junior.qa@zentravix.io | Zentravix@2026 | Individual — QAIP test runs, timesheet |

---

## All Live Projects

| Platform | Description | Live URL | GitHub |
|----------|-------------|---------|--------|
| **ZENTRAVIX** | Organisation Intelligence | **https://bkumars22.github.io/ZENTRAVIX** | [bkumars22/ZENTRAVIX](https://github.com/bkumars22/ZENTRAVIX) |
| **SCIP** | Supply Chain Intelligence | https://bkumars22.github.io/SupplyChainPlatformProject | [bkumars22/SupplyChainPlatformProject](https://github.com/bkumars22/SupplyChainPlatformProject) |
| **ARIA** | Free AI Tutor (35 languages) | https://bkumars22.github.io/ARIA | [bkumars22/ARIA](https://github.com/bkumars22/ARIA) |
| **QAIP** | QA Intelligent Platform | https://bkumars22.github.io/QA-Intelligent-Platform | [bkumars22/QA-Intelligent-Platform](https://github.com/bkumars22/QA-Intelligent-Platform) |

---

## Project Health (Live from QAIP)

| Project | Health | QAIP Pass Rate | Open P0s | Release |
|---------|--------|---------------|----------|---------|
| SCIP — Supply Chain Intelligence | 87/100 AMBER | 95.7% | 1 P0 | Jul 15, 2026 |
| ARIA — Adaptive Real-time Intelligence | 94/100 GREEN | 98.6% | 0 | Jul 1, 2026 |
| QAIP — QA Intelligent Platform | 96/100 GREEN | 99.1% | 0 | Jun 30, 2026 |

---

## What's New — RAG Organisation Intelligence

ZENTRAVIX now answers any org question from real data using semantic search:

```
CEO asks: "Why is SCIP delayed?"
               ↓
[answer_question node] — pgvector cosine search over org knowledge
               ↓
Retrieves: Sprint #12 velocity data, P0 bug record, blocker entries
               ↓
Claude synthesises: "SCIP Sprint #12 has 1 open P0 auth bug
  unresolved for 48 hours. Velocity dropped from 46 to 42.
  Release gated until P0 resolved."
```

vs. old keyword matching that only knew pre-set phrases.

### How RAG Works

```
SEEDED_DATA + QAIP webhooks
          ↓
[startup seed] — org knowledge stored in pgvector (zentravix_org_knowledge)
          ↓
[apscheduler] — re-indexes every 15 minutes
          ↓
User asks any question
          ↓
[retrieve_context] — 384-dim cosine search → top-6 org knowledge chunks
          ↓
[Claude Groq] — synthesises answer using only retrieved data
          ↓
Role-specific framing (CEO gets executive summary, Manager gets blockers)
```

### RAG API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /rag/ingest` | POST | Store any org knowledge chunk |
| `POST /rag/query` | POST | NL search over all org knowledge |
| `POST /rag/project-update` | POST | Live update from QAIP webhook |
| `POST /ai/query` | POST | Full AI query with role-based framing |

---

## Architecture

```
                         ZENTRAVIX
                    ┌────────────────────────────────────────┐
                    │                                        │
   Browser  ──────► │  Next.js 14 (GitHub Pages)            │
                    │  CEO / VP / Manager / Individual       │
                    │  OrgAIAssistant component              │
                    └───────────────┬────────────────────────┘
                                    │ HTTPS REST + WebSocket
                    ┌───────────────▼────────────────────────┐
                    │  Node.js + Express API (Railway)       │
                    │  Socket.io real-time push              │
                    └──────┬─────────────┬────────────────────┘
                           │             │
              ┌────────────▼──┐   ┌──────▼──────────────────────┐
              │  PostgreSQL   │   │  Python FastAPI AI Engine    │
              │  (Railway)    │   │  LangGraph 6-node agent      │
              │  pgvector     │   │  RAG: pgvector + Groq/Claude │
              └───────────────┘   └──────────────────────────────┘
                                           │
                   ┌───────────────────────┤
            QAIP webhooks        Re-index every 15 min
            SCIP supplier data   (apscheduler)
            ARIA student data
```

### LangGraph Intelligence Pipeline (6 nodes)

```
collect_data        ← SEEDED_DATA + live QAIP webhook updates
     │
detect_anomalies    ← P0 checks, velocity thresholds, revenue alerts
     │
generate_alerts     ← CRITICAL/WARNING per anomaly
     │
generate_summaries  ← role-based summaries (CEO/VP/MANAGER/JUNIOR)
     │
answer_question     ← NEW: pgvector RAG → Claude synthesis
     │
update_cache        ← Redis cache 5-min TTL
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, GitHub Pages |
| API | Node.js, Express, Socket.io |
| AI Engine | Python 3.11, FastAPI, LangGraph |
| LLM | Groq Llama-3.3-70b + Anthropic Claude Sonnet 4 |
| RAG | pgvector + sentence-transformers all-MiniLM-L6-v2 |
| Database | PostgreSQL 15 + pgvector (Railway) |
| Cache | Redis (Railway) |
| Scheduling | apscheduler (re-index every 15 min) |
| CI/CD | GitHub Actions → Railway (API + AI) + GitHub Pages (frontend) |

---

## Environment Variables

```env
# AI Engine
DATABASE_URL=postgresql://...         # Railway PostgreSQL (shared with QAIP)
GROQ_API_KEY=gsk_...                 # Free at console.groq.com
ANTHROPIC_API_KEY=sk-ant-...         # Claude for RAG synthesis
EMBED_MODEL=all-MiniLM-L6-v2        # sentence-transformers model

# API Server
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
```

---

## MCP Servers

```json
{
  "mcpServers": {
    "zentravix": {
      "command": "npx",
      "args": ["@zentravix/mcp-server"],
      "env": { "ZENTRAVIX_API_URL": "https://zentravix-api.up.railway.app" }
    }
  }
}
```

---

## Local Development

```bash
# Frontend
cd apps/web && npm install && npm run dev

# AI Engine
cd apps/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# API Server
cd apps/api && npm install && npm run dev
```
