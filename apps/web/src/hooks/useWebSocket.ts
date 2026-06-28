'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? 'http://localhost:3001'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken() {
  return document.cookie.split('; ').find((r) => r.startsWith('ZENTRAVIX_token='))?.split('=')[1] ?? ''
}

export type DeptEvent = {
  event: string
  data:  unknown
}

export type RoleLevel = 'CEO' | 'EXECUTIVE' | 'VP' | 'MANAGER' | 'LEAD' | 'SENIOR' | 'JUNIOR'

// ---------------------------------------------------------------------------
// Demo snapshots — shown when Railway API is unreachable
// ---------------------------------------------------------------------------
const DEMO_SNAPSHOTS: Record<string, Record<string, unknown>> = {
  devops: {
    analysed: {
      projects: {
        QAIP: {
          github_actions: { total: 48, success: 45, failure: 3, success_rate: 0.9375, last_status: 'success', last_branch: 'main' },
          railway_health: { status: 'healthy' },
          ci_health_label: 'good',
        },
        SCIP: {
          github_actions: { total: 32, success: 30, failure: 2, success_rate: 0.9375, last_status: 'success', last_branch: 'main' },
          railway_health: { status: 'healthy' },
          ci_health_label: 'good',
        },
        ARIA: {
          github_actions: { total: 27, success: 27, failure: 0, success_rate: 1.0, last_status: 'success', last_branch: 'main' },
          railway_health: { status: 'healthy' },
          ci_health_label: 'good',
        },
      },
    },
    anomalies: [],
    ceo_summary: 'All 3 platforms healthy — 94% CI success rate across 107 weekly runs. Zero P0 incidents this week.',
    manager_summary: '• QAIP: 94% CI success (3 failures on feature branches, not main)\n• SCIP: 94% CI success, Railway service healthy\n• ARIA: 100% CI success, all deployments green\n• No rollbacks required this cycle',
    engineer_summary: 'GitHub Actions — QAIP: 45/48 runs OK · SCIP: 30/32 · ARIA: 27/27\nRailway Health — QAIP: healthy · SCIP: healthy · ARIA: healthy\nDeployment anomalies: 0\nRecommendation: investigate 2 SCIP feature-branch failures (likely flaky integration test on supplier_risk module)',
    refreshed_at: new Date().toISOString(),
  },
  security: {
    analysed: {
      projects: {
        QAIP: {
          deepeval: { avg_overall: 0.88, failed_metrics: [] },
          owasp:    { critical_count: 0, critical_vulns: [], high_vulns: [] },
          security_grade: 'A',
          owasp_clean: true,
        },
        SCIP: {
          deepeval: { avg_overall: 0.82, failed_metrics: [] },
          owasp:    { critical_count: 0, critical_vulns: [], high_vulns: [] },
          security_grade: 'A',
          owasp_clean: true,
        },
        ARIA: {
          deepeval: { avg_overall: 0.91, failed_metrics: [] },
          owasp:    { critical_count: 0, critical_vulns: [], high_vulns: [] },
          security_grade: 'A',
          owasp_clean: true,
        },
      },
      rbac_denied_24h: [],
    },
    anomalies: [],
    ceo_summary: 'Security posture: Grade A across all 3 platforms. No OWASP critical findings. AI quality averaging 87% — above 75% threshold.',
    manager_summary: '• QAIP: deepeval 88%, OWASP clean, RBAC audit nominal\n• SCIP: deepeval 82%, all scans passing\n• ARIA: deepeval 91% — highest AI quality score this week\n• 0 RBAC denied events in last 24h',
    engineer_summary: 'deepeval scores — QAIP: 0.88 · SCIP: 0.82 · ARIA: 0.91\nOWASP scan — all clean (0 critical, 0 high)\nRBAC denied events (24h): 0\nAll metrics above threshold (0.75). No remediation required.',
  },
  finance: {
    analysed: {
      projects: {
        QAIP: {
          ai:   { cost_30d: 12.40, budget: 50, budget_used_pct: 24.8, call_count: 341, saved_30d: 8.20, model_breakdown: [{ model_id: 'claude-haiku-4-5', calls: 290, cost: 7.25 }, { model_id: 'claude-sonnet-4-6', calls: 51, cost: 5.15 }] },
          infra: { cost_month: 9.00, budget: 30, budget_used_pct: 30 },
        },
        SCIP: {
          ai:   { cost_30d: 8.30, budget: 50, budget_used_pct: 16.6, call_count: 178, saved_30d: 5.50, model_breakdown: [{ model_id: 'claude-haiku-4-5', calls: 160, cost: 4.80 }, { model_id: 'claude-sonnet-4-6', calls: 18, cost: 3.50 }] },
          infra: { cost_month: 7.00, budget: 30, budget_used_pct: 23.3 },
        },
        ARIA: {
          ai:   { cost_30d: 22.10, budget: 60, budget_used_pct: 36.8, call_count: 512, saved_30d: 14.30, model_breakdown: [{ model_id: 'claude-haiku-4-5', calls: 440, cost: 11.00 }, { model_id: 'claude-sonnet-4-6', calls: 72, cost: 11.10 }] },
          infra: { cost_month: 12.00, budget: 40, budget_used_pct: 30 },
        },
        ZENTRAVIX: {
          ai:   { cost_30d: 5.80, budget: 40, budget_used_pct: 14.5, call_count: 89, saved_30d: 3.90, model_breakdown: [{ model_id: 'claude-haiku-4-5', calls: 70, cost: 2.80 }, { model_id: 'claude-sonnet-4-6', calls: 19, cost: 3.00 }] },
          infra: { cost_month: 6.00, budget: 25, budget_used_pct: 24 },
        },
      },
      platform_total: { ai_cost: 48.60, infra_cost: 34.00, total_saved: 31.90 },
      platform_savings_pct: 40,
    },
    anomalies: [],
    ceo_summary: 'Platform AI spend $48.60 this month. ModelRouter saved $31.90 (40%) vs full-weight baseline. All 4 projects within budget.',
    manager_summary: '• ARIA highest AI usage ($22.10) — session volume driving cost, within budget\n• QAIP efficient at $12.40 for 341 calls\n• SCIP lowest AI cost ($8.30) — batch processing optimised\n• All projects under 80% budget threshold — no escalation needed',
    engineer_summary: 'Model routing breakdown:\n  claude-haiku-4-5:  960 calls · $25.85 (cheap path)\n  claude-sonnet-4-6: 160 calls · $22.75 (complex path)\nModelRouter saved $31.90 vs routing everything to Sonnet.\nRecommendation: ARIA session cost growing — consider haiku routing for simple Socratic turns.',
  },
  product: {
    analysed: {
      aria: {
        total_sessions: 1247,
        socratic_rate:  0.91,
        avg_score:      0.88,
        language_count: 12,
        health_label:   'good',
        top_languages: [
          { language: 'English', sessions: 680 },
          { language: 'Hindi',   sessions: 312 },
          { language: 'Tamil',   sessions: 145 },
          { language: 'Telugu',  sessions: 72  },
          { language: 'Kannada', sessions: 38  },
        ],
      },
      qaip: {
        total_runs:      89,
        success_rate:    0.955,
        defects_found:   23,
        p0_found:        0,
        tests_generated: 412,
        total_gaps:      7,
        avg_deepeval:    0.87,
        health_label:    'good',
      },
      scip: {
        total_suppliers: 48,
        healthy:         41,
        at_risk:         6,
        critical:        1,
        avg_risk_score:  0.28,
        anomaly_count:   3,
        health_label:    'warning',
        critical_suppliers: [{ supplier_name: 'GlobalParts Ltd', risk_score: 0.84 }],
      },
    },
    anomalies: [
      { severity: 'P1', project: 'SCIP', msg: '1 supplier at critical risk — GlobalParts Ltd (84%)' },
    ],
    ceo_summary: 'ARIA serving 1,247 sessions this week at 91% Socratic compliance. QAIP caught 23 defects (0 P0s). SCIP flags 1 critical supplier.',
    manager_summary: '• ARIA: 91% Socratic compliance across 12 languages — strong multilingual adoption\n• QAIP: 95.5% pipeline success, 412 tests generated, 0 P0 defects\n• SCIP: 1 supplier escalated to critical — GlobalParts Ltd requires procurement review',
    engineer_summary: 'ARIA — sessions: 1247 · socratic_rate: 0.91 · avg_score: 0.88\nQAIP — runs: 89 · success: 95.5% · tests_generated: 412 · gaps: 7\nSCIP — suppliers: 48 · critical: 1 · IsolationForest anomalies: 3\nAction: review SCIP supplier GlobalParts Ltd (risk_score=0.84, threshold=0.75)',
  },
  hr: {
    analysed: {
      headcount: {
        total: 142, planned: 150, open_roles: 8,
        departments: {
          Engineering: 62, Product: 18, Sales: 22,
          'Customer Success': 15, Finance: 8, HR: 6, Compliance: 5, Infrastructure: 6,
        },
      },
      hiring_pipeline: {
        open_jds: 8, active_interviews: 12, offers_extended: 3, avg_days_to_hire: 34,
        roles: [
          { title: 'Senior ML Engineer',    dept: 'Engineering', stage: 'Interview', priority: 'HIGH' },
          { title: 'Product Manager',       dept: 'Product',     stage: 'Offer',     priority: 'HIGH' },
          { title: 'DevSecOps Engineer',    dept: 'Engineering', stage: 'Screening', priority: 'MEDIUM' },
          { title: 'Customer Success Lead', dept: 'CS',          stage: 'Interview', priority: 'MEDIUM' },
          { title: 'Data Engineer',         dept: 'Engineering', stage: 'Interview', priority: 'HIGH' },
        ],
      },
      leaves: {
        pending_approvals: 4, on_leave_today: 3,
        leave_by_type: { CASUAL: 18, SICK: 7, EARNED: 23, UNPAID: 1 },
      },
      performance: {
        reviews_due_this_quarter: 28, reviews_completed: 19,
        avg_rating: 3.8, high_performers: 12, pip_count: 2,
      },
      attrition: { ytd_voluntary: 4, ytd_involuntary: 1, attrition_rate_pct: 3.5 },
    },
    anomalies: [
      { severity: 'P2', project: 'HR', msg: '4 leave approvals pending > 48h — manager action needed' },
    ],
    ceo_summary: 'Headcount at 142/150 planned — 95% fill rate. 8 open roles in active hiring. Attrition YTD: 3.5% (healthy). Q2 performance reviews 68% complete.',
    manager_summary: '• 4 leave approvals pending > 48h — action required\n• 5 high-priority open roles (ML Eng × 2, PM × 1, Data Eng × 1, CS Lead × 1)\n• 2 employees in PIP — bi-weekly check-in required\n• 12 high performers identified for Q3 retention conversations',
    engineer_summary: 'Headcount: 142 total · Engineering 62 · Sales 22 · Product 18 · CS 15\nHiring pipeline: 8 JDs open · 12 interviews active · 3 offers extended · avg 34 days to hire\nLeave: 4 pending approvals · 3 on leave today\nPerf reviews: 19/28 completed · avg rating 3.8 · 2 on PIP',
  },
  compliance: {
    analysed: {
      eu_ai_act: {
        overall_readiness_pct: 74,
        high_risk_systems: ['QAIP Risk Scorer', 'ARIA Socratic Engine', 'SCIP Supplier Risk'],
        checks: [
          { area: 'Transparency',           status: 'PASS',    score: 0.91 },
          { area: 'Human Oversight',        status: 'PASS',    score: 0.88 },
          { area: 'Data Governance',        status: 'PARTIAL', score: 0.72 },
          { area: 'Technical Robustness',   status: 'PASS',    score: 0.85 },
          { area: 'Accuracy & Reliability', status: 'PARTIAL', score: 0.78 },
          { area: 'Record-keeping',         status: 'FAIL',    score: 0.45 },
        ],
      },
      gdpr: {
        data_mapping_complete: true,
        dpia_completed: 3, dpia_pending: 1,
        consent_mechanisms_ok: true,
        breach_incidents_ytd: 0,
      },
      security_posture: {
        pen_test_last: '2026-04-15',
        critical_cves_open: 0, high_cves_open: 2,
        soc2_status: 'In Progress', iso27001_status: 'Planned',
      },
      audit_trail: {
        events_30d: 4821, anomalous_events: 3, rbac_violations_7d: 0,
      },
    },
    anomalies: [
      { severity: 'P1', project: 'Compliance', msg: 'EU AI Act record-keeping failing — LangSmith traces must be archived (45%)' },
      { severity: 'P2', project: 'Compliance', msg: '1 DPIA pending for SCIP supplier data processing' },
    ],
    ceo_summary: 'EU AI Act readiness at 74% — Record-keeping control failing (45%). GDPR posture strong with 0 breach incidents YTD. 2 CVE highs open, no criticals. SOC 2 Type II in progress.',
    manager_summary: '• EU AI Act: record-keeping must reach 80%+ before Q3 audit — assign LangSmith archival task\n• 1 DPIA pending for SCIP supplier data processing — legal review needed by end of sprint\n• 2 open high CVEs — DevSecOps to patch before next pen test\n• SOC 2 Type II prep: 6 controls remain for evidence collection',
    engineer_summary: 'EU AI Act record-keeping: FAIL (0.45) — LangSmith trace export + archival pipeline needed\nGDPR: data mapping ✓ · DPIAs: 3/4 complete · 0 breaches YTD\nSecurity: 0 critical CVEs · 2 high CVEs open · pen test: 2026-04-15\nAudit trail: 4821 events (30d) · 3 anomalous · 0 RBAC violations (7d)',
  },
}

export function useWebSocket(role: RoleLevel) {
  const socketRef  = useRef<Socket | null>(null)
  const [connected, setConnected]   = useState(false)
  const [lastEvent, setLastEvent]   = useState<DeptEvent | null>(null)
  const [criticalAlert, setCritical] = useState<DeptEvent | null>(null)

  useEffect(() => {
    if (!role) return
    socketRef.current = io(WS_URL, {
      query: { role },
      transports: ['websocket', 'polling'],
    })

    const socket = socketRef.current
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('qaip:update', (data: unknown) => setLastEvent({ event: 'qaip:update', data }))

    const DEPTS = ['devops', 'security', 'finance', 'product', 'hr', 'compliance']
    DEPTS.forEach((dept) => {
      socket.on(`dept:${dept}:update`, (data: unknown) => {
        setLastEvent({ event: `dept:${dept}:update`, data })
      })
    })

    socket.on('dept:alert:critical', (data: unknown) => {
      setCritical({ event: 'dept:alert:critical', data })
    })

    return () => { socket.disconnect() }
  }, [role])

  const requestSnapshot = useCallback((dept: string) => {
    socketRef.current?.emit('request:snapshot', dept)
  }, [])

  const joinDept = useCallback((dept: string) => {
    socketRef.current?.emit('join:department', dept)
  }, [])

  return { connected, lastEvent, criticalAlert, socket: socketRef.current, requestSnapshot, joinDept }
}

export function useDeptSnapshot(dept: string, role: RoleLevel) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [isDemo,   setIsDemo]   = useState(false)
  const { lastEvent, criticalAlert, connected, joinDept } = useWebSocket(role)

  useEffect(() => {
    setLoading(true)
    setIsDemo(false)
    fetch(`${API_URL}/api/dept/${dept}/snapshot`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => { setSnapshot(d); setLoading(false) })
      .catch(() => {
        setSnapshot(DEMO_SNAPSHOTS[dept] ?? null)
        setIsDemo(true)
        setLoading(false)
      })
  }, [dept])

  useEffect(() => {
    if (connected) joinDept(dept)
  }, [connected, dept, joinDept])

  useEffect(() => {
    if (lastEvent?.event === `dept:${dept}:update`) {
      setSnapshot(lastEvent.data as Record<string, unknown>)
      setIsDemo(false)
    }
  }, [lastEvent, dept])

  return { snapshot, loading, isDemo, criticalAlert }
}
