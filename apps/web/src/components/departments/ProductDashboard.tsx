'use client'

import { useDeptSnapshot } from '@/hooks/useWebSocket'
import MetricCard          from '@/components/shared/MetricCard'
import type { RoleLevel }  from '@/hooks/useWebSocket'

interface Props { role: RoleLevel }

const HEALTH_COLOR: Record<string, string> = {
  good:     'text-green-400 bg-green-900/20 border-green-700/40',
  warning:  'text-amber-400 bg-amber-900/20 border-amber-700/40',
  critical: 'text-red-400 bg-red-900/20 border-red-700/40',
}
const HEALTH_DOT: Record<string, string> = {
  good: 'bg-green-400', warning: 'bg-amber-400 animate-pulse', critical: 'bg-red-500 animate-pulse',
}

export default function ProductDashboard({ role }: Props) {
  const { snapshot, loading, error } = useDeptSnapshot('product', role)

  if (loading) return <div className="text-slate-400 text-sm p-8 text-center animate-pulse">Loading Product metrics…</div>
  if (error)   return <div className="text-red-400 text-sm p-8 bg-red-900/20 rounded-xl">Error: {error}</div>

  const analysed  = (snapshot?.analysed as any) ?? {}
  const aria      = analysed.aria  ?? {}
  const qaip      = analysed.qaip  ?? {}
  const scip      = analysed.scip  ?? {}
  const anomalies = (snapshot?.anomalies as any[]) ?? []
  const p0Count   = anomalies.filter((a) => a.severity === 'P0').length

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📊 Product Department</h2>
        {p0Count > 0 && (
          <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-1.5 font-bold animate-pulse">
            ⚠ {p0Count} P0 Product Issue(s)
          </span>
        )}
      </div>

      {/* CEO summary */}
      {(role === 'CEO' || role === 'EXECUTIVE') && (snapshot?.ceo_summary as string) && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Executive Summary</div>
          <p className="text-amber-100 text-sm leading-relaxed">{snapshot?.ceo_summary as string}</p>
        </div>
      )}

      {/* Cross-product KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="ARIA Sessions (7d)"   value={String(aria.total_sessions ?? 0)}   color="blue"  />
        <MetricCard label="QAIP Pipelines (7d)"  value={String(qaip.total_runs    ?? 0)}   color="blue"  />
        <MetricCard label="SCIP Suppliers"        value={String(scip.total_suppliers ?? 0)}   color="blue"  />
        <MetricCard label="P0 Issues"             value={String(p0Count)} color={p0Count > 0 ? 'red' : 'green'} />
      </div>

      {/* Three product cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* ARIA card */}
        <div className={`border rounded-xl p-5 space-y-4 ${HEALTH_COLOR[aria.health_label ?? 'good']}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-lg">ARIA</span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold`}>
              <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[aria.health_label ?? 'good']}`} />
              {(aria.health_label ?? 'good').toUpperCase()}
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Socratic Compliance Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <div
                  className={(aria.socratic_rate ?? 0) >= 0.85 ? 'h-2 rounded-full bg-green-400' : 'h-2 rounded-full bg-amber-400'}
                  style={{ width: `${((aria.socratic_rate ?? 0) * 100).toFixed(0)}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${(aria.socratic_rate ?? 0) >= 0.85 ? 'text-green-400' : 'text-amber-400'}`}>
                {((aria.socratic_rate ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Avg score</span><div className="text-white font-bold">{((aria.avg_score ?? 0) * 100).toFixed(0)}%</div></div>
            <div><span className="text-slate-500">Languages</span><div className="text-white font-bold">{aria.language_count ?? 0}</div></div>
          </div>

          {/* Language breakdown — manager/engineer */}
          {(role === 'MANAGER' || role === 'LEAD' || role === 'SENIOR' || role === 'JUNIOR') &&
            (aria.top_languages ?? []).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Top languages</div>
              {(aria.top_languages as any[]).slice(0, 5).map((l: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-300">{l.language}</span>
                  <span className="text-blue-400 font-mono">{l.sessions}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QAIP card */}
        <div className={`border rounded-xl p-5 space-y-4 ${HEALTH_COLOR[qaip.health_label ?? 'good']}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-lg">QAIP</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[qaip.health_label ?? 'good']}`} />
              {(qaip.health_label ?? 'good').toUpperCase()}
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Pipeline Success Rate</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <div
                  className={(qaip.success_rate ?? 0) >= 0.9 ? 'h-2 rounded-full bg-green-400' : 'h-2 rounded-full bg-amber-400'}
                  style={{ width: `${((qaip.success_rate ?? 0) * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white">
                {((qaip.success_rate ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Defects found</span><div className="text-white font-bold">{qaip.defects_found ?? 0}</div></div>
            <div><span className="text-slate-500">P0 found</span><div className={`font-bold ${(qaip.p0_found ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{qaip.p0_found ?? 0}</div></div>
            <div><span className="text-slate-500">Tests generated</span><div className="text-white font-bold">{qaip.tests_generated ?? 0}</div></div>
            <div><span className="text-slate-500">Gap count</span><div className="text-white font-bold">{qaip.total_gaps ?? 0}</div></div>
          </div>

          {(qaip.avg_deepeval ?? 0) > 0 && (
            <div className="text-xs flex justify-between text-slate-400">
              <span>deepeval avg</span>
              <span className={`font-bold ${(qaip.avg_deepeval ?? 0) >= 0.75 ? 'text-green-400' : 'text-red-400'}`}>
                {((qaip.avg_deepeval ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* SCIP card */}
        <div className={`border rounded-xl p-5 space-y-4 ${HEALTH_COLOR[scip.health_label ?? 'good']}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-lg">SCIP</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[scip.health_label ?? 'good']}`} />
              {(scip.health_label ?? 'good').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center"><div className="text-green-400 font-bold text-lg">{scip.healthy ?? 0}</div><div className="text-slate-500">Healthy</div></div>
            <div className="text-center"><div className="text-amber-400 font-bold text-lg">{scip.at_risk ?? 0}</div><div className="text-slate-500">At Risk</div></div>
            <div className="text-center"><div className={`font-bold text-lg ${(scip.critical ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{scip.critical ?? 0}</div><div className="text-slate-500">Critical</div></div>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Avg risk score</span>
            <span className={`font-bold ${(scip.avg_risk_score ?? 0) > 0.7 ? 'text-red-400' : (scip.avg_risk_score ?? 0) > 0.4 ? 'text-amber-400' : 'text-green-400'}`}>
              {((scip.avg_risk_score ?? 0) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>IsolationForest anomalies</span>
            <span className={`font-bold ${(scip.anomaly_count ?? 0) > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {scip.anomaly_count ?? 0}
            </span>
          </div>

          {/* Critical suppliers list — manager+ */}
          {(role === 'MANAGER' || role === 'LEAD' || role === 'SENIOR') &&
            (scip.critical_suppliers ?? []).length > 0 && (
            <div className="space-y-1 border-t border-slate-700 pt-2">
              <div className="text-xs text-red-400 font-semibold mb-1">Critical suppliers:</div>
              {(scip.critical_suppliers as any[]).map((s: any, i: number) => (
                <div key={i} className="text-xs flex justify-between">
                  <span className="text-slate-300 truncate max-w-[120px]">{s.supplier_name ?? s.supplier_id}</span>
                  <span className="text-red-400 font-mono">{((s.risk_score ?? 0) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manager summary */}
      {(role === 'MANAGER' || role === 'LEAD') && (snapshot?.manager_summary as string) && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Manager Analysis</div>
          <pre className="text-blue-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">{snapshot?.manager_summary as string}</pre>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Anomalies Detected</div>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
                a.severity === 'P0' ? 'bg-red-900/30 border-red-700/40' : 'bg-amber-900/30 border-amber-700/40'
              }`}>
                <span className={`font-bold shrink-0 ${a.severity === 'P0' ? 'text-red-400' : 'text-amber-400'}`}>{a.severity}</span>
                <span className="text-white font-medium mr-2">{a.project}</span>
                <span className="text-slate-300">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engineer detail */}
      {(role === 'SENIOR' || role === 'JUNIOR') && (snapshot?.engineer_summary as string) && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">📊 Engineer Technical Detail</div>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{snapshot?.engineer_summary as string}</pre>
        </div>
      )}

    </div>
  )
}
