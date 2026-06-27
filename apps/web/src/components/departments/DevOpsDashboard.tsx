'use client'

import { useDeptSnapshot }   from '@/hooks/useWebSocket'
import MetricCard            from '@/components/shared/MetricCard'
import type { RoleLevel }    from '@/hooks/useWebSocket'

interface Props { role: RoleLevel }

const STATUS_COLOR: Record<string, string> = {
  healthy: 'text-green-400', degraded: 'text-amber-400', down: 'text-red-400', unknown: 'text-slate-400',
}
const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-green-400', degraded: 'bg-amber-400 animate-pulse', down: 'bg-red-400 animate-pulse', unknown: 'bg-slate-500',
}
const CI_COLOR: Record<string, string> = {
  good: 'text-green-400', warning: 'text-amber-400', critical: 'text-red-400',
}
const PROJECTS = ['QAIP', 'SCIP', 'ARIA'] as const

export default function DevOpsDashboard({ role }: Props) {
  const { snapshot, loading, error, criticalAlert } = useDeptSnapshot('devops', role)

  if (loading) return <div className="text-slate-400 text-sm p-8 text-center animate-pulse">Loading DevOps metrics…</div>
  if (error)   return <div className="text-red-400 text-sm p-8 bg-red-900/20 rounded-xl">Error: {error}</div>

  const projects   = (snapshot?.analysed as any)?.projects ?? {}
  const anomalies  = (snapshot?.anomalies as any[]) ?? []
  const ceoSummary     = snapshot?.ceo_summary as string
  const managerSummary = snapshot?.manager_summary as string
  const engSummary     = snapshot?.engineer_summary as string
  const refreshedAt    = snapshot?.refreshed_at as string

  const totalRuns = PROJECTS.reduce((s, p) => s + (projects[p]?.github_actions?.total ?? 0), 0)
  const failedRuns = PROJECTS.reduce((s, p) => s + (projects[p]?.github_actions?.failure ?? 0), 0)
  const allHealthy = PROJECTS.every((p) => projects[p]?.railway_health?.status === 'healthy')

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⚙️ DevOps Department
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ml-2 ${allHealthy ? 'text-green-400 border-green-700 bg-green-900/20' : 'text-amber-400 border-amber-700 bg-amber-900/20'}`}>
              {allHealthy ? 'ALL SYSTEMS UP' : 'DEGRADED'}
            </span>
          </h2>
          {refreshedAt && <p className="text-slate-500 text-xs mt-1">Last refresh: {new Date(refreshedAt).toLocaleTimeString()}</p>}
        </div>
        {criticalAlert && (
          <div className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 max-w-xs">
            🚨 {(criticalAlert.data as any)?.msg}
          </div>
        )}
      </div>

      {/* CEO summary */}
      {(role === 'CEO' || role === 'EXECUTIVE') && ceoSummary && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Executive Summary</div>
          <p className="text-amber-100 text-sm leading-relaxed">{ceoSummary}</p>
        </div>
      )}

      {/* Platform KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="CI Runs (7d)"    value={String(totalRuns)} color="blue" />
        <MetricCard label="Failed Runs"     value={String(failedRuns)} color={failedRuns > 0 ? 'red' : 'green'} />
        <MetricCard label="Services"        value={allHealthy ? '3/3 Up' : `${PROJECTS.filter(p => projects[p]?.railway_health?.status === 'healthy').length}/3 Up`} color={allHealthy ? 'green' : 'amber'} />
        <MetricCard label="P0 Alerts"       value={String(anomalies.filter(a => a.severity === 'P0').length)} color={anomalies.some(a => a.severity === 'P0') ? 'red' : 'green'} />
      </div>

      {/* Per-project cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PROJECTS.map((proj) => {
          const gh  = projects[proj]?.github_actions ?? {}
          const rh  = projects[proj]?.railway_health  ?? {}
          const cil = projects[proj]?.ci_health_label ?? 'unknown'
          const svc = rh.status ?? 'unknown'
          return (
            <div key={proj} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{proj}</span>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[svc]}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[svc]}`} />
                  {svc.toUpperCase()}
                </span>
              </div>

              {/* CI stats */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>CI Success Rate</span>
                  <span className={`font-semibold ${CI_COLOR[cil]}`}>
                    {gh.success_rate != null ? `${(gh.success_rate * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
                {gh.success_rate != null && (
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${cil === 'good' ? 'bg-green-400' : cil === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${(gh.success_rate * 100).toFixed(0)}%` }}
                    />
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Last run</span>
                  <span className={gh.last_status === 'success' ? 'text-green-400' : 'text-red-400'}>
                    {gh.last_status ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Branch</span>
                  <span className="text-slate-300">{gh.last_branch ?? 'main'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Manager summary */}
      {(role === 'MANAGER' || role === 'LEAD') && managerSummary && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Manager Analysis</div>
          <pre className="text-blue-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">{managerSummary}</pre>
        </div>
      )}

      {/* Anomaly list */}
      {anomalies.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Anomalies Detected ({anomalies.length})
          </div>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-xs ${
                a.severity === 'P0' ? 'bg-red-900/30 border border-red-700/40' :
                a.severity === 'P1' ? 'bg-amber-900/30 border border-amber-700/40' :
                'bg-slate-700/50 border border-slate-600/40'
              }`}>
                <span className={`font-bold shrink-0 ${a.severity === 'P0' ? 'text-red-400' : a.severity === 'P1' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {a.severity}
                </span>
                <div>
                  <span className="text-white font-medium">{a.project}</span>
                  <span className="text-slate-300 ml-2">{a.msg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engineer technical detail */}
      {(role === 'SENIOR' || role === 'JUNIOR' || role === 'LEAD') && engSummary && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">⚙️ Engineer Detail</div>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{engSummary}</pre>
        </div>
      )}

    </div>
  )
}
