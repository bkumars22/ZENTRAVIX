# ZENTRAVIX — Organisation Intelligence Platform

**From Junior Developer to CEO — Every Role, Every Department, One Platform**

ZENTRAVIX integrates SCIP (Supply Chain AI), ARIA (AI Tutor), and QAIP (QA Intelligent Platform) into a single enterprise intelligence layer. Every metric — from QAIP test pass rates to Sales pipeline — flows into role-specific dashboards in real time.

Author: B KumaraSwamy | swamy.kumar02@gmail.com | Bangalore | 2026

---

## Live Access

Frontend: **[https://bkumars22.github.io/ZENTRAVIX](https://bkumars22.github.io/ZENTRAVIX)**

> The frontend runs in **demo mode** — no backend required. Sign in with the credentials below and all 4 dashboard layers work immediately.

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

## SCIP and ARIA Live Data

| Project | Health | QAIP Pass Rate | Tests | Open P0s | Release |
|---------|--------|---------------|-------|----------|---------|
| SCIP — Supply Chain Intelligence | 87/100 AMBER | 95.7% | 186 | 1 P0 | Jul 15, 2026 |
| ARIA — Adaptive Real-time Intelligence | 94/100 GREEN | 98.6% | 142 | 0 | Jul 1, 2026 |

QAIP fires a webhook on every analysis run. ZENTRAVIX receives it, updates the project health score, creates a CRITICAL alert if any P0 is found, and pushes the update live via Socket.io to every connected dashboard.

---

## Architecture

```
                         ZENTRAVIX
                    ┌────────────────────────────────────────┐
                    │                                        │
   Browser  ──────► │  Next.js 14 (GitHub Pages)            │
                    │  CEO / VP / Manager / Individual       │
                    │  Role-based dashboards                 │
                    └───────────────┬────────────────────────┘
                                    │ HTTPS REST + WebSocket
                    ┌───────────────▼────────────────────────┐
                    │  Node.js + Express API (Railway)       │
                    │  /api/auth  /api/ceo  /api/vp          │
                    │  /api/manager  /api/me  /api/qaip      │
                    │  Socket.io for real-time push          │
                    └──────┬─────────────┬────────────────────┘
                           │             │
              ┌────────────▼──┐   ┌──────▼──────────────────┐
              │  PostgreSQL   │   │  Python FastAPI           │
              │  (Railway)    │   │  AI Engine (Railway)      │
              │  Prisma ORM   │   │  LangGraph 6-node agent  │
              │  16 models    │   │  Claude claude-sonnet-4-6│
              └───────────────┘   └──────────────────────────┘
                                           │
              ┌────────────────────────────▼──────────────────┐
              │  Integrated Projects (via QAIP webhooks)      │
              │                                               │
              │  SCIP ──► /api/qaip/webhook                   │
              │  ARIA ──► /api/qaip/webhook                   │
              │  QAIP ──► testmind-production.up.railway.app  │
              └───────────────────────────────────────────────┘
```

### Services

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| web | Next.js 14 + TypeScript + TailwindCSS | 3000 | 4 dashboard layers, static export |
| api | Node.js + Express + TypeScript | 3001 | REST API + JWT auth + Socket.io |
| ai-engine | Python FastAPI + LangGraph | 8001 | 6-node intelligence agent |
| postgres | PostgreSQL 15 (Railway managed) | 5432 | All organisational data |
| redis | Redis 7 | 6379 | WebSocket session store |
| nginx | nginx:alpine | 80 | Reverse proxy |

### Role Hierarchy

| Level | Role | What They See |
|-------|------|--------------|
| 7 | CEO / Board | Revenue, burn rate, NPS, all project health scores, AI alerts |
| 6 | CTO / CFO | All department data, budget vs actual, tech metrics |
| 5 | VP / AVP | Own department — OKRs, capacity, releases, hiring |
| 4 | Manager / Lead | Own team — Kanban, sprint, individual performance |
| 2-3 | Senior / Lead | Own work, PRs, test results |
| 1 | Junior | My tasks, my PRs, my timesheet, QAIP test run |

---

## MCP Server Integration

ZENTRAVIX AI features connect via 5 Model Context Protocol servers. The LangGraph AI engine uses them to pull live org data.

### MCP Servers

| Server | Package | Role in ZENTRAVIX |
|--------|---------|------------------|
| Playwright MCP | @playwright/mcp@latest | Runs E2E tests across SCIP + ARIA + ZENTRAVIX dashboards |
| GitHub MCP | @modelcontextprotocol/server-github | Reads PRs, velocity, commit history from SCIP + ARIA repos |
| Filesystem MCP | @modelcontextprotocol/server-filesystem | Reads generated reports and local AI summaries |
| Jira MCP | @modelcontextprotocol/server-atlassian | Sprint data, auto-creates P0/P1 tickets on QAIP defects |
| Slack MCP | @modelcontextprotocol/server-slack | Posts CRITICAL alerts to #zentravix-alerts |

### Claude Desktop Config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-pat"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/KumarFolder/mydocs/ZENTRAVIX"]
    },
    "jira": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-atlassian"],
      "env": {
        "JIRA_HOST": "your-org.atlassian.net",
        "JIRA_EMAIL": "swamy.kumar02@gmail.com",
        "JIRA_API_TOKEN": "your-jira-api-token"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_CHANNEL": "zentravix-alerts"
      }
    }
  }
}
```

### How Each MCP Server Is Used

| Dashboard | MCP | Data Pulled |
|-----------|-----|-------------|
| CEO alerts | GitHub MCP | Sprint velocity drops, PR merge rate |
| CEO alerts | Jira MCP | P0/P1 count per project |
| VP releases | Playwright MCP | E2E pass rate per release branch |
| Manager standup | Jira MCP | Task status changes in last 24 hours |
| CRITICAL alerts | Slack MCP | Posted to #zentravix-alerts instantly |
| AI query | All 5 | "Why is SCIP delayed?" — reads all sources |

---

## Playwright E2E Testing

### Test Suites

| Suite | Tests | Coverage |
|-------|-------|---------|
| auth.spec.ts | 12 | Login, logout, role redirect, token expiry |
| ceo-dashboard.spec.ts | 18 | Revenue bar, project cards, AI alerts, NLP query |
| vp-dashboard.spec.ts | 22 | 5 tabs, budget chart, QAIP scores, Run QAIP |
| manager-dashboard.spec.ts | 20 | Kanban, team health, sprint burndown, AI standup |
| individual-dashboard.spec.ts | 16 | Tasks, QAIP results, timesheet, growth |
| qaip-integration.spec.ts | 14 | Webhook, alert creation, live update |
| Total | 102 | Full platform |

### Run Commands

```bash
cd apps/web
npm install
npx playwright install chromium

# Run against live GitHub Pages
PLAYWRIGHT_BASE_URL=https://bkumars22.github.io/ZENTRAVIX npx playwright test

# Run against Docker
docker-compose up -d
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test

# UI mode
npx playwright test --ui

# Specific suite
npx playwright test ceo-dashboard.spec.ts

# HTML report
npx playwright test --reporter=html && npx playwright show-report
```

---

## QAIP Webhook Integration

QAIP sends a webhook to ZENTRAVIX on every analysis run:

```http
POST https://zentravix-api.up.railway.app/api/qaip/webhook
Content-Type: application/json
X-Zentravix-Secret: zentravix-qaip-2026

{
  "project_id": "SCIP",
  "run_id": "run_abc123",
  "coverage": 95.7,
  "defects": 3,
  "p0_count": 1,
  "p1_count": 2,
  "pass_rate": 95.7,
  "report_url": "https://testmind-production.up.railway.app/reports/abc123"
}
```

ZENTRAVIX then:
1. Updates project `qaipScore`, `qaipPassRate`, `qaipP0Count`, `qaipDefects`
2. Creates a CRITICAL `AiAlert` targeting CEO + VP if `p0_count > 0`
3. Emits `qaip:update` via Socket.io — all dashboards refresh in under 2 seconds

### Configure Webhooks on SCIP and ARIA Repos

GitHub repo Settings → Webhooks → Add webhook:
- Payload URL: `https://zentravix-api.up.railway.app/api/qaip/webhook`
- Content type: `application/json`
- Secret: `zentravix-qaip-2026`
- Events: push, pull_request

---

## Railway Deployment (Backend API + DB)

### Step 1: Go to railway.app

1. Sign in at [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `bkumars22/ZENTRAVIX`

### Step 2: Add PostgreSQL

In your Railway project → **New Service** → **Database** → **PostgreSQL**

Copy the `DATABASE_URL` from the PostgreSQL service.

### Step 3: Set Environment Variables

In the API service → Variables:

```
DATABASE_URL=<from PostgreSQL service>
JWT_SECRET=zentravix-production-secret-minimum-32-chars
ANTHROPIC_API_KEY=<your key>
QAIP_WEBHOOK_SECRET=zentravix-qaip-2026
NODE_ENV=production
```

### Step 4: Set Root Directory

In the API service → Settings → Source:
- Root Directory: `apps/api`
- Build Command: `npm install && npm run build`
- Start Command: `node dist/index.js`

### Step 5: Deploy

Railway auto-deploys on every push to main. Your API URL will be:
`https://zentravix-api.up.railway.app`

---

## AI Intelligence Engine

6-node LangGraph agent runs every 15 minutes.

```
Node 1: collect_data     — Jira, GitHub, QAIP, Finance DB, HR, CRM
Node 2: detect_anomalies — IsolationForest flags deviations > 2 std dev
Node 3: generate_alerts  — Claude writes plain-English alerts per anomaly
Node 4: generate_summaries — Role-specific: CEO 3 sentences, Manager actionable
Node 5: answer_questions — "Why is SCIP delayed?" → reads DB + answers
Node 6: update_cache     — Redis + Socket.io push to all dashboards
```

Example AI responses:

| Question | Answer |
|----------|--------|
| "Why is SCIP delayed?" | "Sprint #12 has 1 P0 auth bug open 48 hours. QAIP pass rate 95.7%. Release gated until P0 resolved." |
| "ARIA release status?" | "ARIA v1.8.0 on track for Jul 1. 98.6% pass rate, 0 P0s. Release readiness confirmed." |
| "Sales pipeline?" | "Pipeline at 2.3x coverage. 3 deals in final stage worth Rs.2.1Cr. Below 3x — Q3 at risk." |

---

## Database Schema (16 Models)

| Domain | Models |
|--------|--------|
| Identity | User, Department |
| Technology | Project, Sprint, PullRequest, Release |
| Finance | Budget, Expense |
| People | Employee, Leave, PerformanceReview |
| Sales | Deal, Customer, Ticket |
| AI | AiAlert, AiSummary |
| Work | Task, Timesheet |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | Min 32 characters |
| ANTHROPIC_API_KEY | Yes | Claude AI for intelligence engine |
| GROQ_API_KEY | No | Groq for fast risk scoring |
| QAIP_API_URL | Yes | QAIP backend URL |
| QAIP_WEBHOOK_SECRET | Yes | Shared secret for webhook auth |
| REDIS_URL | Yes | Redis for WebSocket sessions |

---

## Integration Summary

| Project | Repo | Status in ZENTRAVIX |
|---------|------|---------------------|
| SCIP | bkumars22/SupplyChainPlatformProject | Health 87/100, QAIP 95.7%, 1 P0 |
| ARIA | bkumars22/ARIA | Health 94/100, QAIP 98.6%, release Jul 1 |
| QAIP | bkumars22/QA-Intelligent-Platform | Webhook source, testmind-production.up.railway.app |

---

B KumaraSwamy | swamy.kumar02@gmail.com | Bangalore | 2026
