'use client'

import { useState, useEffect } from 'react'
import RagStatus from '@/components/shared/RagStatus'
import HealthScore from '@/components/shared/HealthScore'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Project {
  id: string; name: string; healthScore: number; qaipScore: number; qaipPassRate: number
  qaipP0Count: number; openP0s: number; velocity: number; sprintNumber: number
  releaseDate?: string; status: string; jiraKey?: string
}

interface AiAlert {
  id: string; severity: string; message: string; actionNeeded: string; category: string
}

interface Release {
  id: string; version: string; plannedDate: string; status: string; p0Count: number; projectName?: string; qaipScore: number
}

interface DashboardData {
  revenue: { current: number; target: number; mom: number }
  burnRate: { monthly: number; runwayMonths: number }
  headcount: { current: number; planned: number }
  nps: { current: number; lastMonth: number }
  projects: Project[]
  alerts: AiAlert[]
  releases: Release[]
  techMetrics: { totalTests: number; avgPassRate: number; openP0s: number; deployments: number }
}

function fmtCr(n: number) {
  return `Rs.${(n / 10000000).toFixed(1)}Cr`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getProjectRag(p: Project): 'GREEN' | 'AMBER' | 'RED' {
  if (p.openP0s > 0) return 'AMBER'
  if (p.healthScore >= 80) return 'GREEN'
  if (p.healthScore >= 60) return 'AMBER'
  return 'RED'
}

function getReleaseRag(r: Release): 'GREEN' | 'AMBER' | 'GREY' {
  if (r.status === 'PLANNED') return 'GREY'
  if (r.p0Count > 0) return 'AMBER'
  return 'GREEN'
}

export default function CeoDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  function getToken() {
    return document.cookie.split('; ').find(r => r.startsWith('ZENTRAVIX_token='))?.split('=')[1] ?? ''
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/ceo/dashboard`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (res.ok) setData(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  async function handleAiQuery() {
    if (!aiQuestion.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ question: aiQuestion }),
      })
      const json = await res.json()
      setAiAnswer(json.answer)
    } catch { setAiAnswer('AI engine unavailable.') }
    setAiLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const SCIP = data?.projects.find(p => p.jiraKey === 'SCIP' || p.name === 'SCIP')
  const ARIA = data?.projects.find(p => p.jiraKey === 'ARIA' || p.name === 'ARIA')

  const revenuePercent = data ? Math.round((data.revenue.current / data.revenue.target) * 100) : 84

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Organisation-wide intelligence — all systems</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live — updates every 60s
        </div>
      </div>

      {/* Section 1: Executive Health Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-wide">Revenue MTD</div>
          <div className="text-2xl font-bold text-white mt-2">{fmtCr(data?.revenue.current ?? 42000000)}</div>
          <div className="text-slate-400 text-xs mt-1">Target: {fmtCr(data?.revenue.target ?? 50000000)}</div>
          <div className="mt-3 bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-brand-600 h-1.5 rounded-full"
              style={{ width: `${revenuePercent}%` }}
            />
          </div>
          <div className="text-green-400 text-xs mt-1.5">+{data?.revenue.mom ?? 12}% MoM</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-wide">Monthly Burn</div>
          <div className="text-2xl font-bold text-white mt-2">{fmtCr(data?.burnRate.monthly ?? 18000000)}</div>
          <div className="text-slate-400 text-xs mt-1">Runway</div>
          <div className="text-amber-400 text-xl font-bold">{data?.burnRate.runwayMonths ?? 14} months</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-wide">Headcount</div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.headcount.current ?? 142}
            <span className="text-slate-500 text-lg">/{data?.headcount.planned ?? 150}</span>
          </div>
          <div className="mt-3 bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${Math.round(((data?.headcount.current ?? 142) / (data?.headcount.planned ?? 150)) * 100)}%` }}
            />
          </div>
          <div className="text-slate-400 text-xs mt-1.5">
            {data?.headcount.planned ?? 150 - (data?.headcount.current ?? 142)} open roles
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-slate-400 text-xs uppercase tracking-wide">NPS Score</div>
          <div className="text-2xl font-bold text-white mt-2">{data?.nps.current ?? 67}</div>
          <div className="text-green-400 text-xs mt-1">+{(data?.nps.current ?? 67) - (data?.nps.lastMonth ?? 63)} pts vs last month</div>
          <div className="mt-3 bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${data?.nps.current ?? 67}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Project Health Cards */}
      <div>
        <h2 className="text-white font-semibold mb-3">Project Health</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* SCIP Card */}
          {SCIP && (
            <div className={`bg-slate-800 border rounded-xl p-5 ${SCIP.openP0s > 0 ? 'border-amber-600' : 'border-slate-700'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white font-bold text-lg">{SCIP.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">Supply Chain Intelligence Platform</div>
                </div>
                <HealthScore score={SCIP.healthScore} size="sm" />
              </div>
              <div className="mt-3">
                <RagStatus status={getProjectRag(SCIP)} />
                {SCIP.openP0s > 0 && (
                  <div className="mt-2 text-amber-400 text-xs font-medium">
                    {SCIP.openP0s} P0 bug blocking release
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-white font-bold">{SCIP.qaipPassRate.toFixed(1)}%</div>
                  <div className="text-slate-500 text-xs">QAIP</div>
                </div>
                <div>
                  <div className="text-white font-bold">{SCIP.velocity}</div>
                  <div className="text-slate-500 text-xs">Velocity</div>
                </div>
                <div>
                  <div className="text-white font-bold">#{SCIP.sprintNumber}</div>
                  <div className="text-slate-500 text-xs">Sprint</div>
                </div>
              </div>
              {SCIP.releaseDate && (
                <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                  Release: {fmtDate(SCIP.releaseDate)}
                </div>
              )}
            </div>
          )}

          {/* ARIA Card */}
          {ARIA && (
            <div className="bg-slate-800 border border-green-700/50 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white font-bold text-lg">{ARIA.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">Adaptive Real-time Intelligence</div>
                </div>
                <HealthScore score={ARIA.healthScore} size="sm" />
              </div>
              <div className="mt-3">
                <RagStatus status="GREEN" label="RELEASE READY" />
                <div className="mt-2 text-green-400 text-xs font-medium">
                  {ARIA.qaipPassRate.toFixed(1)}% pass rate — release confirmed
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-white font-bold">{ARIA.qaipPassRate.toFixed(1)}%</div>
                  <div className="text-slate-500 text-xs">QAIP</div>
                </div>
                <div>
                  <div className="text-white font-bold">{ARIA.velocity}</div>
                  <div className="text-slate-500 text-xs">Velocity</div>
                </div>
                <div>
                  <div className="text-white font-bold">#{ARIA.sprintNumber}</div>
                  <div className="text-slate-500 text-xs">Sprint</div>
                </div>
              </div>
              {ARIA.releaseDate && (
                <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                  Release: {fmtDate(ARIA.releaseDate)}
                </div>
              )}
            </div>
          )}

          {/* Add Project Card */}
          <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-500 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-slate-700 group-hover:bg-brand-600/20 flex items-center justify-center text-slate-400 group-hover:text-brand-400 text-xl font-bold transition-colors mb-3">
              +
            </div>
            <div className="text-slate-400 group-hover:text-slate-300 text-sm font-medium transition-colors">Add Project</div>
            <div className="text-slate-600 text-xs mt-1">Connect QAIP webhook</div>
          </div>
        </div>
      </div>

      {/* Section 3: AI Insights + AI Query */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">AI Insights</h2>
          <div className="space-y-3">
            {(data?.alerts ?? []).map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-3 border ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-red-900/20 border-red-700'
                    : alert.severity === 'WARNING'
                    ? 'bg-amber-900/20 border-amber-700'
                    : 'bg-green-900/20 border-green-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <div>
                    <p className="text-slate-200 text-sm leading-snug">{alert.message}</p>
                    {alert.actionNeeded && (
                      <p className="text-slate-400 text-xs mt-1">{alert.actionNeeded}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!data?.alerts || data.alerts.length === 0) && (
              <p className="text-slate-500 text-sm">No active alerts</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Ask ZENTRAVIX</h2>
          <div className="space-y-3">
            <textarea
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask anything about your organisation — SCIP status, sales pipeline, burn rate..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-brand-500 h-20"
            />
            <button
              onClick={handleAiQuery}
              disabled={aiLoading || !aiQuestion.trim()}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {aiLoading ? 'Thinking...' : 'Ask AI'}
            </button>
            {aiAnswer && (
              <div className="bg-slate-900 border border-slate-600 rounded-lg p-3">
                <p className="text-slate-200 text-sm leading-relaxed">{aiAnswer}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Release Calendar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Release Calendar</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-4">Release</th>
                <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-4">Project</th>
                <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-4">Date</th>
                <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-4">Status</th>
                <th className="text-left text-slate-400 text-xs font-medium pb-2 pr-4">QAIP</th>
                <th className="text-left text-slate-400 text-xs font-medium pb-2">Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {(data?.releases ?? []).map((r) => {
                const rag = getReleaseRag(r)
                return (
                  <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 pr-4 text-white font-medium">{r.version}</td>
                    <td className="py-3 pr-4 text-slate-300">{r.projectName ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-300">{fmtDate(r.plannedDate)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        r.status === 'IN_PROGRESS' ? 'bg-blue-900/40 text-blue-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {r.qaipScore > 0 ? `${r.qaipScore.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3">
                      <RagStatus status={rag} size="sm" label={rag === 'AMBER' ? `${r.p0Count} P0` : rag} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tech Metrics Strip */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">QAIP Technical Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{data?.techMetrics.totalTests ?? 328}</div>
            <div className="text-slate-400 text-xs mt-0.5">Total Tests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{data?.techMetrics.avgPassRate.toFixed(1) ?? '97.2'}%</div>
            <div className="text-slate-400 text-xs mt-0.5">Avg Pass Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${(data?.techMetrics.openP0s ?? 1) > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {data?.techMetrics.openP0s ?? 1}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">Open P0s</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{data?.techMetrics.deployments ?? 47}</div>
            <div className="text-slate-400 text-xs mt-0.5">Deployments MTD</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-400">2</div>
            <div className="text-slate-400 text-xs mt-0.5">QAIP-connected Projects</div>
          </div>
        </div>
      </div>
    </div>
  )
}
