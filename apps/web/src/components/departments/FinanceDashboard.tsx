'use client'

import { useDeptSnapshot } from '@/hooks/useWebSocket'
import MetricCard          from '@/components/shared/MetricCard'
import type { RoleLevel }  from '@/hooks/useWebSocket'

interface Props { role: RoleLevel }

const PROJECTS = ['QAIP', 'SCIP', 'ARIA', 'ZENTRAVIX'] as const

function BudgetBar({ used, label }: { used: number; label: string }) {
  const pct  = Math.min(used, 100)
  const color = used >= 100 ? 'bg-red-500' : used >= 80 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={used >= 80 ? 'text-amber-400 font-bold' : 'text-slate-300'}>{used.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function FinanceDashboard({ role }: Props) {
  const { snapshot, loading, isDemo } = useDeptSnapshot('finance', role)

  if (loading) return <div className="text-slate-400 text-sm p-8 text-center animate-pulse">Loading Finance metrics…</div>

  const projects      = (snapshot?.analysed as any)?.projects ?? {}
  const platform      = (snapshot?.analysed as any)?.platform_total ?? {}
  const savingsPct    = (snapshot?.analysed as any)?.platform_savings_pct ?? 0
  const anomalies     = (snapshot?.anomalies as any[]) ?? []
  const overBudget    = anomalies.filter((a) => a.type === 'budget_exceeded')

  const totalAI    = platform.ai_cost   ?? 0
  const totalInfra = platform.infra_cost ?? 0
  const totalSaved = platform.total_saved ?? 0

  return (
    <div className="space-y-8">

      {isDemo && (
        <div className="text-xs text-slate-400 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Demo data — backend offline. Connect Railway API for live metrics.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">💰 Finance Department</h2>
        {overBudget.length > 0 && (
          <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-1.5 font-bold animate-pulse">
            ⚠ Budget exceeded in {overBudget.length} project(s)
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

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="AI Cost (30d)"      value={`$${totalAI.toFixed(2)}`}   color="blue"  />
        <MetricCard label="Infra Cost (month)" value={`$${totalInfra.toFixed(2)}`} color="blue"  />
        <MetricCard label="AI Cost Saved"      value={`$${totalSaved.toFixed(2)}`} color="green" subValue={`${savingsPct.toFixed(0)}% savings via ModelRouter`} />
        <MetricCard label="Budget Alerts"      value={String(anomalies.length)}    color={anomalies.length > 0 ? 'amber' : 'green'} />
      </div>

      {/* Per-project finance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PROJECTS.map((proj) => {
          const ai   = projects[proj]?.ai   ?? {}
          const inf  = projects[proj]?.infra ?? {}
          return (
            <div key={proj} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{proj}</span>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">${((ai.cost_30d ?? 0) + (inf.cost_month ?? 0)).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">total this period</div>
                </div>
              </div>

              <BudgetBar used={ai.budget_used_pct ?? 0}   label={`AI: $${(ai.cost_30d ?? 0).toFixed(2)} / $${ai.budget ?? 50}`} />
              <BudgetBar used={inf.budget_used_pct ?? 0}  label={`Infra: $${(inf.cost_month ?? 0).toFixed(2)} / $${inf.budget ?? 30}`} />

              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>{ai.call_count ?? 0} AI calls</span>
                <span className="text-green-400">Saved: ${(ai.saved_30d ?? 0).toFixed(3)}</span>
              </div>

              {/* Model breakdown — engineer/manager */}
              {(role === 'SENIOR' || role === 'JUNIOR' || role === 'MANAGER' || role === 'LEAD') &&
                (ai.model_breakdown ?? []).length > 0 && (
                <div className="border-t border-slate-700 pt-3 space-y-1">
                  <div className="text-xs text-slate-500 mb-2">Model cost breakdown</div>
                  {(ai.model_breakdown as any[]).map((m, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[180px]">{m.model_id}</span>
                      <div className="flex gap-3 text-right shrink-0">
                        <span className="text-slate-500">{m.calls}×</span>
                        <span className="text-blue-300 font-mono">${Number(m.cost).toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Manager summary */}
      {(role === 'MANAGER' || role === 'LEAD') && (snapshot?.manager_summary as string) && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Manager Analysis</div>
          <pre className="text-blue-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">{snapshot?.manager_summary as string}</pre>
        </div>
      )}

      {/* Budget anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Budget Anomalies</div>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
                a.severity === 'P0' ? 'bg-red-900/30 border-red-700/40' : 'bg-amber-900/30 border-amber-700/40'
              }`}>
                <span className={`font-bold shrink-0 ${a.severity === 'P0' ? 'text-red-400' : 'text-amber-400'}`}>{a.severity}</span>
                <span className="text-slate-300">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engineer detail */}
      {(role === 'SENIOR' || role === 'JUNIOR') && (snapshot?.engineer_summary as string) && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">💰 Engineer Cost Detail</div>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{snapshot?.engineer_summary as string}</pre>
        </div>
      )}

    </div>
  )
}
