# ZENTRAVIX — Organisation Intelligence Platform

Production-grade enterprise intelligence platform integrating SCIP (Supply Chain Intelligence), ARIA (AI Tutor), and QAIP (QA Intelligent Platform) into a single unified view — tailored to every organisational role.

## Live Access

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| CEO | ceo@zentravix.io | Zentravix@2026 | CEO Executive View |
| CTO | cto@zentravix.io | Zentravix@2026 | VP Engineering View |
| CFO | cfo@zentravix.io | Zentravix@2026 | VP Finance View |
| VP Engineering | vp.eng@zentravix.io | Zentravix@2026 | VP Dashboard |
| Engineering Manager | manager@zentravix.io | Zentravix@2026 | Manager Dashboard |
| Senior Developer | senior.dev@zentravix.io | Zentravix@2026 | Individual Dashboard |
| QA Engineer | junior.qa@zentravix.io | Zentravix@2026 | Individual Dashboard |

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for AI engine local dev)

### Start with Docker Compose

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

docker-compose up --build
```

Services start at:
- Web: http://localhost:3000
- API: http://localhost:3001
- AI Engine: http://localhost:8001
- Nginx proxy: http://localhost:80

### Local Development

```bash
# Install dependencies
npm install

# Start all services (requires postgres + redis running)
npm run dev

# Seed the database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Database Setup

```bash
cd packages/db

# Run migrations
npx prisma migrate dev

# Seed with demo data
npx ts-node prisma/seed.ts

# Open studio
npx prisma studio
```

## Architecture

```
                   +------------------+
                   |   nginx :80      |
                   +--------+---------+
                            |
           +----------------+----------------+
           |                |                |
    +------+-----+  +-------+------+  +------+-----+
    | web :3000  |  | api :3001    |  | ai   :8001  |
    | Next.js 14 |  | Express+TS   |  | FastAPI+    |
    | TypeScript |  | Prisma ORM   |  | LangGraph   |
    | TailwindCSS|  | Socket.io    |  | Claude AI   |
    +------+-----+  +-------+------+  +------+-----+
                            |                |
                   +--------+--------+       |
                   |                 |       |
            +------+----+    +-------+--+    |
            | Postgres  |    | Redis    +----+
            | :5432     |    | :6379    |
            +-----------+    +----------+
```

## Role-based Intelligence

ZENTRAVIX uses 7 role levels to determine what data each user sees:

| Level | Role | View |
|-------|------|------|
| 7 | CEO | Full organisation — revenue, burn, NPS, all projects |
| 6 | EXECUTIVE | Department-level budget, tech metrics, team |
| 5 | VP | Projects, velocity, budget, hiring, releases |
| 4 | MANAGER | Team kanban, sprint tracker, blockers |
| 3 | LEAD | Project metrics, team capacity |
| 2 | SENIOR | Personal tasks, PRs, test results |
| 1 | JUNIOR | Personal tasks, QAIP runs, timesheet |

## QAIP Integration

ZENTRAVIX receives real-time QA results from QAIP (TestMind) via webhook.

### Webhook Setup

Configure your QAIP platform to POST to:
```
POST https://your-ZENTRAVIX-api/api/qaip/webhook
Headers:
  x-qaip-secret: <QAIP_WEBHOOK_SECRET from .env>
Content-Type: application/json

Body:
{
  "project_id": "SCIP",
  "run_id": "run-20260624-001",
  "coverage": 95.7,
  "defects": 3,
  "p0_count": 1,
  "p1_count": 2,
  "pass_rate": 95.7,
  "report_url": "https://testmind-production.up.railway.app/reports/..."
}
```

When QAIP sends results:
- Project health scores update in real-time
- P0 defects trigger CRITICAL alerts to CEO and VP roles
- WebSocket events broadcast to connected dashboards instantly

## Integrated Projects

### SCIP — Supply Chain Intelligence Platform
- Repository: https://github.com/bkumars22/SupplyChainPlatformProject
- Stack: Java 17 + Spring Boot 3 + React 18 + Python FastAPI + IsolationForest + LangGraph + PostgreSQL
- QAIP key: `SCIP`

### ARIA — Adaptive Real-time Intelligence for Anyone
- Repository: https://github.com/bkumars22/ARIA
- Stack: Claude AI + LangGraph + React 18 + Spring Boot + Python FastAPI + Whisper STT + PostgreSQL
- QAIP key: `ARIA`

### QAIP — QA Intelligent Platform
- Platform: TestMind (https://testmind-production.up.railway.app)
- Integration: Webhook-based, real-time push

## GitHub Actions CI/CD

Requires these repository secrets:
- `RAILWAY_TOKEN` — Railway deployment token
- `JWT_SECRET` — Minimum 32-character secret
- `ANTHROPIC_API_KEY` — For Claude AI integration

Pipeline runs on every push to `main`:
1. Type-check and build API
2. Type-check and build Web
3. Run AI engine smoke tests
4. Deploy all three services to Railway

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | Node.js, Express, TypeScript, Prisma |
| AI Engine | Python, FastAPI, LangGraph, Claude claude-sonnet-4-6 |
| Database | PostgreSQL 15 |
| Cache / Realtime | Redis, Socket.io |
| Auth | JWT, RBAC (7 levels) |
| DevOps | Docker Compose, GitHub Actions, Railway |
