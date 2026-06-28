'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface RunEvent {
  timestamp: number
  project:   string
  task:      string
  model:     string
  tokens:    number
  cost_usd:  number
  saved_usd: number
  latency_ms: number
}

interface ProjectStats {
  calls:    number
  cost_usd: number
  saved_usd: number
}

interface CostDashboard {
  total_calls:      number
  total_cost_usd:   number
  total_saved_usd:  number
  savings_pct:      number
  baseline_model:   string
  by_project:       Record<string, ProjectStats>
  by_model:         Record<string, { calls: number; cost_usd: number }>
  by_task:          Record<string, { calls: number; cost_usd: number }>
  recent_events:    RunEvent[]
}

const PROJECT_COLOR: Record<string, string> = {
  QAIP:      'bg-blue-500',
  SCIP:      'bg-purple-500',
  ARIA:      'bg-green-500',
  ZENTRAVIX: 'bg-amber-500',
}

function fmtCost(usd: number): string {
  const rs = usd * 84
  return rs < 1 ? `₹${rs.toFixed(3)}` : `₹${rs.toFixed(2)}`
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function RunTimeline({ events }: { events: RunEvent[] }) {
  const last10 = events.slice(0, 10)
  return (
    <div className="flex items-end gap-1 h-8">
      {last10.map((e, i) => (
        <div
          key={i}
          title={`${e.project} · ${e.task} · ${fmtMs(e.latency_ms)} · ${fmtCost(e.cost_usd)}`}
          className={`flex-1 rounded-sm ${PROJECT_COLOR[e.project] ?? 'bg-slate-500'}`}
          style={{ height: `${Math.max(20, Math.min(100, (e.latency_ms / 5000) * 100))}%`, opacity: 0.85 }}
        />
      ))}
      {last10.length === 0 && (
        <span className="text-slate-600 text-xs self-center">No runs yet</span>
      )}
    </div>
  )
}

export default function ObservabilityWidget() {
  const [data, setData]       = useState<CostDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)

  function getToken() {
    return document.cookie.split('; ').find(r => r.startsWith('ZENTRAVIX_token='))?.split('=')[1] ?? ''
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/cost/dashboard`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (res.ok) setData(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  const slowestTask = data
    ? Object.entries(data.by_task).sort((a, b) => b[1].cost_usd - a[1].cost_usd)[0]
    : null

  const topModel = data
    ? Object.entries(data.by_model).sort((a, b) => b[1].calls - a[1].calls)[0]
    : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Observability</span>
          {data && (
            <span className="text-xs text-slate-500">
              {data.total_calls} calls · {fmtCost(data.total_cost_usd)} · {data.savings_pct}% saved
            </span>
          )}
          {!data && !loading && (
            <span className="text-xs text-slate-600">LangSmith offline</span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700">

          {loading && (
            <div className="text-slate-500 text-xs py-4 text-center animate-pulse">Loading cost data…</div>
          )}

          {!loading && !data && (
            <div className="text-slate-500 text-xs py-4 text-center">
              Cost API unavailable. Ensure ZENTRAVIX API is running.
            </div>
          )}

          {data && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3 pt-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{data.total_calls}</div>
                  <div className="text-slate-500 text-xs">Total Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{fmtCost(data.total_cost_usd)}</div>
                  <div className="text-slate-500 text-xs">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{fmtCost(data.total_saved_usd)}</div>
                  <div className="text-slate-500 text-xs">Saved</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{data.savings_pct}%</div>
                  <div className="text-slate-500 text-xs">vs Baseline</div>
                </div>
              </div>

              {/* Run timeline */}
              <div>
                <div className="text-xs text-slate-500 mb-2">Last 10 runs (height = latency, colour = project)</div>
                <RunTimeline events={data.recent_events} />
                <div className="flex gap-2 mt-1.5">
                  {Object.entries(PROJECT_COLOR).map(([proj, cls]) => (
                    <span key={proj} className="flex items-center gap-1 text-xs text-slate-500">
                      <span className={`w-2 h-2 rounded-sm ${cls}`} />{proj}
                    </span>
                  ))}
                </div>
              </div>

              {/* Per-project costs */}
              <div>
                <div className="text-xs text-slate-500 mb-2">Cost by project</div>
                <div className="space-y-1.5">
                  {Object.entries(data.by_project).map(([proj, stats]) => {
                    const maxCost = Math.max(...Object.values(data.by_project).map(s => s.cost_usd), 0.0001)
                    const pct = Math.round((stats.cost_usd / maxCost) * 100)
                    return (
                      <div key={proj} className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs w-20 shrink-0">{proj}</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${PROJECT_COLOR[proj] ?? 'bg-slate-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-slate-300 text-xs w-16 text-right">{fmtCost(stats.cost_usd)}</span>
                        <span className="text-slate-500 text-xs w-10 text-right">{stats.calls}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Insights row */}
              <div className="grid grid-cols-2 gap-3">
                {slowestTask && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Highest-cost task</div>
                    <div className="text-white text-sm font-medium truncate">{slowestTask[0]}</div>
                    <div className="text-slate-400 text-xs">{fmtCost(slowestTask[1].cost_usd)} · {slowestTask[1].calls} calls</div>
                  </div>
                )}
                {topModel && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Most-used model</div>
                    <div className="text-white text-sm font-medium truncate">{topModel[0].split('-').slice(-2).join('-')}</div>
                    <div className="text-slate-400 text-xs">{topModel[1].calls} calls · {fmtCost(topModel[1].cost_usd)}</div>
                  </div>
                )}
              </div>

              {/* LangSmith link */}
              <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                Full traces at smith.langchain.com when LANGCHAIN_API_KEY is set
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
