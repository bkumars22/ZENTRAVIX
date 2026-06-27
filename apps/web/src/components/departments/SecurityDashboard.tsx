'use client'

import { useDeptSnapshot } from '@/hooks/useWebSocket'
import MetricCard          from '@/components/shared/MetricCard'
import type { RoleLevel }  from '@/hooks/useWebSocket'

interface Props { role: RoleLevel }

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-400', B: 'text-blue-400', C: 'text-amber-400', F: 'text-red-400',
}
const SEV_BG: Record<string, string> = {
  CRITICAL: 'bg-red-900/40 border-red-700/50 text-red-300',
  HIGH:     'bg-orange-900/40 border-orange-700/50 text-orange-300',
  MEDIUM:   'bg-amber-900/30 border-amber-700/40 text-amber-300',
  LOW:      'bg-slate-700/50 border-slate-600/40 text-slate-300',
}
const PROJECTS = ['QAIP', 'SCIP', 'ARIA'] as const

export default function SecurityDashboard({ role }: Props) {
  const { snapshot, loading, isDemo } = useDeptSnapshot('security', role)

  if (loading) return <div className="text-slate-400 text-sm p-8 text-center animate-pulse">Loading Security metrics…</div>

  const projects   = (snapshot?.analysed as any)?.projects ?? {}
  const rbac       = (snapshot?.analysed as any)?.rbac_denied_24h ?? []
  const anomalies  = (snapshot?.anomalies as any[]) ?? []
  const p0Count    = anomalies.filter((a) => a.severity === 'P0').length

  return (
    <div className="space-y-8">

      {isDemo && (
        <div className="text-xs text-slate-400 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Demo data — backend offline. Connect Railway API for live metrics.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">🔒 Security Department</h2>
        {p0Count > 0 && (
          <span className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-1.5 font-bold animate-pulse">
            ⚠ {p0Count} CRITICAL VULNERABILITY
          </span>
        )}
      </div>

      {/* CEO view */}
      {(role === 'CEO' || role === 'EXECUTIVE') && (snapshot?.ceo_summary as string) && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Executive Summary</div>
          <p className="text-amber-100 text-sm leading-relaxed">{snapshot?.ceo_summary as string}</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="P0 Vulnerabilities"   value={String(p0Count)}  color={p0Count > 0 ? 'red' : 'green'} />
        <MetricCard label="RBAC Denied (24h)"    value={String(rbac.length)} color={rbac.length > 20 ? 'amber' : 'green'} />
        <MetricCard label="Projects Scanned"     value="3/3" color="blue" />
        <MetricCard label="Security Alerts"      value={String(anomalies.length)} color={anomalies.length > 0 ? 'amber' : 'green'} />
      </div>

      {/* Per-project security cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PROJECTS.map((proj) => {
          const de    = projects[proj]?.deepeval ?? {}
          const ow    = projects[proj]?.owasp    ?? {}
          const grade = projects[proj]?.security_grade ?? '—'
          const clean = projects[proj]?.owasp_clean ?? true
          return (
            <div key={proj} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{proj}</span>
                <span className={`text-2xl font-black ${GRADE_COLOR[grade] ?? 'text-slate-400'}`}>{grade}</span>
              </div>

              {/* deepeval */}
              <div>
                <div className="text-xs text-slate-500 mb-1">deepeval avg score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${(de.avg_overall ?? 0) >= 0.85 ? 'bg-green-400' : (de.avg_overall ?? 0) >= 0.75 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${((de.avg_overall ?? 0) * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${(de.avg_overall ?? 0) >= 0.75 ? 'text-green-400' : 'text-red-400'}`}>
                    {de.avg_overall != null ? (de.avg_overall * 100).toFixed(0) + '%' : '—'}
                  </span>
                </div>
                {de.failed_metrics?.length > 0 && (
                  <div className="mt-1 text-xs text-red-400">Failed: {de.failed_metrics.join(', ')}</div>
                )}
              </div>

              {/* OWASP */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">OWASP Status</span>
                <span className={clean ? 'text-green-400 font-semibold' : 'text-red-400 font-bold'}>
                  {clean ? '✓ Clean' : `${ow.critical_count ?? 0} CRITICAL`}
                </span>
              </div>
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

      {/* OWASP findings table */}
      {(role === 'MANAGER' || role === 'LEAD' || role === 'SENIOR') && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">OWASP Findings</div>
          <div className="space-y-2">
            {PROJECTS.flatMap((proj) =>
              [...(projects[proj]?.owasp?.critical_vulns ?? []),
               ...(projects[proj]?.owasp?.high_vulns ?? [])].map((v: any, i: number) => (
                <div key={`${proj}-${i}`} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${SEV_BG[v.severity] ?? SEV_BG.LOW}`}>
                  <span className="font-bold w-16 shrink-0">{v.severity}</span>
                  <span className="text-white/70 w-14 shrink-0">{proj}</span>
                  <span className="flex-1">{v.category}</span>
                  <span className="font-mono font-bold">{v.vuln_count}</span>
                </div>
              ))
            )}
            {PROJECTS.every((p) => projects[p]?.owasp_clean) && (
              <div className="text-green-400 text-xs text-center py-2">✓ No OWASP findings across all projects</div>
            )}
          </div>
        </div>
      )}

      {/* RBAC denied (engineer only) */}
      {(role === 'SENIOR' || role === 'JUNIOR') && rbac.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">RBAC Denied Access — Top Patterns (24h)</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2">Project</th><th className="text-left py-2">Role</th>
                <th className="text-left py-2">Action</th><th className="text-left py-2">Resource</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {rbac.slice(0, 10).map((r: any, i: number) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-1.5 text-blue-400">{r.project}</td>
                  <td className="py-1.5 text-slate-300">{r.role}</td>
                  <td className="py-1.5 text-amber-400 font-mono">{r.action}</td>
                  <td className="py-1.5 text-slate-400 truncate max-w-[180px]">{r.resource}</td>
                  <td className="py-1.5 text-right font-bold text-red-400">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Engineer technical detail */}
      {(role === 'SENIOR' || role === 'JUNIOR') && (snapshot?.engineer_summary as string) && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">🔒 Engineer Technical Detail</div>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{snapshot?.engineer_summary as string}</pre>
        </div>
      )}

    </div>
  )
}
