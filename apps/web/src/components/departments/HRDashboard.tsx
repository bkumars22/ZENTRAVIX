'use client'

import { useDeptSnapshot } from '@/hooks/useWebSocket'
import MetricCard          from '@/components/shared/MetricCard'
import type { RoleLevel }  from '@/hooks/useWebSocket'

interface Props { role: RoleLevel }

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   'text-red-400 bg-red-900/20 border-red-700/40',
  MEDIUM: 'text-amber-400 bg-amber-900/20 border-amber-700/40',
  LOW:    'text-slate-400 bg-slate-800 border-slate-700',
}

const STAGE_COLOR: Record<string, string> = {
  Offer:     'bg-green-900/40 text-green-300 border-green-700',
  Interview: 'bg-blue-900/40 text-blue-300 border-blue-700',
  Screening: 'bg-slate-700 text-slate-300 border-slate-600',
}

export default function HRDashboard({ role }: Props) {
  const { snapshot, loading, isDemo } = useDeptSnapshot('hr', role)

  if (loading) return (
    <div className="text-slate-400 text-sm p-8 text-center animate-pulse">Loading HR metrics…</div>
  )

  const hc        = (snapshot?.analysed as any)?.headcount        ?? {}
  const hiring    = (snapshot?.analysed as any)?.hiring_pipeline   ?? {}
  const leaves    = (snapshot?.analysed as any)?.leaves            ?? {}
  const perf      = (snapshot?.analysed as any)?.performance       ?? {}
  const attrition = (snapshot?.analysed as any)?.attrition         ?? {}
  const anomalies = (snapshot?.anomalies as any[]) ?? []
  const ceoSum    = snapshot?.ceo_summary     as string
  const mgrSum    = snapshot?.manager_summary as string
  const engSum    = snapshot?.engineer_summary as string

  const fillRate = hc.total && hc.planned ? Math.round((hc.total / hc.planned) * 100) : 95
  const reviewPct = perf.reviews_due_this_quarter && perf.reviews_completed
    ? Math.round((perf.reviews_completed / perf.reviews_due_this_quarter) * 100) : 68

  return (
    <div className="space-y-8">
      {isDemo && (
        <div className="text-xs text-slate-400 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Demo data — connect ZENTRAVIX API for live HRMS metrics.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">👥 HR Department</h2>
          <p className="text-slate-500 text-sm mt-0.5">Headcount · Hiring · Performance · Attrition</p>
        </div>
        {anomalies.length > 0 && (
          <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-lg px-3 py-2">
            ⚠️ {anomalies.length} item{anomalies.length !== 1 ? 's' : ''} need attention
          </div>
        )}
      </div>

      {/* CEO Summary */}
      {(role === 'CEO' || role === 'EXECUTIVE') && ceoSum && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Executive Summary</div>
          <p className="text-amber-100 text-sm leading-relaxed">{ceoSum}</p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Headcount"    value={`${hc.total ?? 142}/${hc.planned ?? 150}`} color="blue" />
        <MetricCard label="Fill Rate"    value={`${fillRate}%`} color={fillRate >= 90 ? 'green' : 'amber'} />
        <MetricCard label="Attrition YTD" value={`${attrition.attrition_rate_pct ?? 3.5}%`} color="green" />
        <MetricCard label="Open Roles"   value={String(hc.open_roles ?? 8)} color={hc.open_roles > 5 ? 'amber' : 'green'} />
      </div>

      {/* Headcount by department */}
      {hc.departments && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-sm font-semibold text-white mb-4">Headcount by Department</div>
          <div className="space-y-2">
            {Object.entries(hc.departments as Record<string, number>).map(([dept, count]) => {
              const maxCount = Math.max(...Object.values(hc.departments as Record<string, number>))
              const pct = Math.round((count / maxCount) * 100)
              return (
                <div key={dept} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-36 shrink-0">{dept}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-300 text-xs w-6 text-right font-mono">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hiring pipeline + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hiring pipeline */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Hiring Pipeline</div>
            <div className="text-xs text-slate-500">{hiring.avg_days_to_hire ?? 34}d avg to hire</div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-white">{hiring.open_jds ?? 8}</div>
              <div className="text-slate-500 text-xs mt-0.5">Open JDs</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-blue-400">{hiring.active_interviews ?? 12}</div>
              <div className="text-slate-500 text-xs mt-0.5">Interviewing</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-green-400">{hiring.offers_extended ?? 3}</div>
              <div className="text-slate-500 text-xs mt-0.5">Offers Out</div>
            </div>
          </div>
          {hiring.roles && (
            <div className="space-y-2">
              {(hiring.roles as any[]).map((r: any, i: number) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border text-xs ${PRIORITY_COLOR[r.priority] ?? PRIORITY_COLOR.LOW}`}>
                  <div>
                    <span className="font-medium text-white">{r.title}</span>
                    <span className="text-slate-500 ml-2">{r.dept}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STAGE_COLOR[r.stage] ?? STAGE_COLOR.Screening}`}>
                    {r.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance reviews */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">Performance Reviews — Q2</div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Completion</span>
              <span className="font-semibold text-white">{perf.reviews_completed ?? 19}/{perf.reviews_due_this_quarter ?? 28}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${reviewPct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-white">{perf.avg_rating ?? 3.8}</div>
              <div className="text-slate-500 text-xs mt-0.5">Avg Rating / 5</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-green-400">{perf.high_performers ?? 12}</div>
              <div className="text-slate-500 text-xs mt-0.5">High Performers</div>
            </div>
          </div>
          {perf.pip_count > 0 && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2 text-xs">
              <span className="text-red-400 font-semibold">{perf.pip_count}</span>
              <span className="text-red-300/80 ml-1">employee{perf.pip_count !== 1 ? 's' : ''} on PIP — bi-weekly check-in required</span>
            </div>
          )}

          {/* Leave overview */}
          <div className="pt-2 border-t border-slate-700">
            <div className="text-xs text-slate-500 mb-2">Leave (YTD)</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries((leaves.leave_by_type ?? {}) as Record<string, number>).map(([type, count]) => (
                <span key={type} className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                  {type}: {count}
                </span>
              ))}
            </div>
            {leaves.pending_approvals > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                ⏳ {leaves.pending_approvals} pending approvals
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manager analysis */}
      {(role === 'MANAGER' || role === 'LEAD') && mgrSum && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Manager Analysis</div>
          <pre className="text-blue-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">{mgrSum}</pre>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Action Required ({anomalies.length})
          </div>
          <div className="space-y-2">
            {anomalies.map((a: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-xs border ${
                a.severity === 'P0' ? 'bg-red-900/30 border-red-700/40' :
                a.severity === 'P1' ? 'bg-amber-900/30 border-amber-700/40' :
                'bg-slate-700/50 border-slate-600/40'
              }`}>
                <span className={`font-bold shrink-0 ${a.severity === 'P0' ? 'text-red-400' : a.severity === 'P1' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {a.severity}
                </span>
                <span className="text-slate-300">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engineer detail */}
      {(role === 'SENIOR' || role === 'JUNIOR' || role === 'LEAD') && engSum && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">HR Data Detail</div>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{engSum}</pre>
        </div>
      )}
    </div>
  )
}
