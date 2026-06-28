'use client'

import { useDeptSnapshot }  from '@/hooks/useWebSocket'
import MetricCard           from '@/components/shared/MetricCard'
import type { RoleLevel }   from '@/hooks/useWebSocket'

interface Props { role: RoleLevel }

const STATUS_COLOR: Record<string, string> = {
  PASS:    'text-green-400 bg-green-900/20 border-green-700/40',
  PARTIAL: 'text-amber-400 bg-amber-900/20 border-amber-700/40',
  FAIL:    'text-red-400 bg-red-900/20 border-red-700/40',
}

const STATUS_ICON: Record<string, string> = { PASS: '✓', PARTIAL: '◑', FAIL: '✗' }

export default function ComplianceDashboard({ role }: Props) {
  const { snapshot, loading, isDemo } = useDeptSnapshot('compliance', role)

  if (loading) return (
    <div className="text-slate-400 text-sm p-8 text-center animate-pulse">Loading compliance metrics…</div>
  )

  const euAct      = (snapshot?.analysed as any)?.eu_ai_act        ?? {}
  const gdpr       = (snapshot?.analysed as any)?.gdpr             ?? {}
  const secPos     = (snapshot?.analysed as any)?.security_posture  ?? {}
  const auditTrail = (snapshot?.analysed as any)?.audit_trail       ?? {}
  const anomalies  = (snapshot?.anomalies as any[]) ?? []
  const ceoSum     = snapshot?.ceo_summary     as string
  const mgrSum     = snapshot?.manager_summary as string
  const engSum     = snapshot?.engineer_summary as string

  const checks: { area: string; status: string; score: number }[] = euAct.checks ?? []
  const passCount    = checks.filter((c) => c.status === 'PASS').length
  const partialCount = checks.filter((c) => c.status === 'PARTIAL').length
  const failCount    = checks.filter((c) => c.status === 'FAIL').length
  const readiness    = euAct.overall_readiness_pct ?? 74

  const readinessColor = readiness >= 80 ? 'green' : readiness >= 60 ? 'amber' : 'red'

  return (
    <div className="space-y-8">
      {isDemo && (
        <div className="text-xs text-slate-400 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Demo data — connect ZENTRAVIX API for live compliance telemetry.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">⚖️ Compliance Department</h2>
          <p className="text-slate-500 text-sm mt-0.5">EU AI Act · GDPR · SOC 2 · Audit Trail</p>
        </div>
        {anomalies.some((a: any) => a.severity === 'P1') && (
          <div className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 animate-pulse">
            🚨 Compliance action required
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
        <MetricCard label="EU AI Act Readiness" value={`${readiness}%`} color={readinessColor} />
        <MetricCard label="GDPR Breaches YTD"   value={String(gdpr.breach_incidents_ytd ?? 0)} color="green" />
        <MetricCard label="Critical CVEs Open"   value={String(secPos.critical_cves_open ?? 0)} color={secPos.critical_cves_open > 0 ? 'red' : 'green'} />
        <MetricCard label="RBAC Violations (7d)" value={String(auditTrail.rbac_violations_7d ?? 0)} color={auditTrail.rbac_violations_7d > 0 ? 'red' : 'green'} />
      </div>

      {/* EU AI Act checklist + GDPR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* EU AI Act readiness */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">EU AI Act Readiness</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">{passCount} PASS</span>
              <span className="text-amber-400">{partialCount} PARTIAL</span>
              <span className="text-red-400">{failCount} FAIL</span>
            </div>
          </div>

          {/* Readiness progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Overall readiness</span>
              <span className="font-bold text-white">{readiness}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${readiness >= 80 ? 'bg-green-500' : readiness >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${readiness}%` }}
              />
            </div>
          </div>

          {/* Per-area checks */}
          <div className="space-y-2">
            {checks.map((check, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border text-xs ${STATUS_COLOR[check.status] ?? ''}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{STATUS_ICON[check.status]}</span>
                  <span className="font-medium">{check.area}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-black/30 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${check.status === 'PASS' ? 'bg-green-400' : check.status === 'PARTIAL' ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.round(check.score * 100)}%` }}
                    />
                  </div>
                  <span className="font-semibold">{Math.round(check.score * 100)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* High-risk AI systems */}
          {euAct.high_risk_systems?.length > 0 && (
            <div className="pt-2 border-t border-slate-700">
              <div className="text-xs text-slate-500 mb-2">High-risk AI systems subject to Act</div>
              <div className="flex flex-wrap gap-2">
                {(euAct.high_risk_systems as string[]).map((sys: string) => (
                  <span key={sys} className="text-xs bg-slate-700 border border-slate-600 px-2 py-0.5 rounded text-slate-300">
                    {sys}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GDPR + Security posture */}
        <div className="space-y-4">
          {/* GDPR */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <div className="text-sm font-semibold text-white">GDPR Status</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded-lg px-3 py-2 border ${gdpr.data_mapping_complete ? 'bg-green-900/20 border-green-700/40 text-green-400' : 'bg-red-900/20 border-red-700/40 text-red-400'}`}>
                {gdpr.data_mapping_complete ? '✓' : '✗'} Data Mapping
              </div>
              <div className={`rounded-lg px-3 py-2 border ${gdpr.consent_mechanisms_ok ? 'bg-green-900/20 border-green-700/40 text-green-400' : 'bg-red-900/20 border-red-700/40 text-red-400'}`}>
                {gdpr.consent_mechanisms_ok ? '✓' : '✗'} Consent Mechanisms
              </div>
              <div className={`rounded-lg px-3 py-2 border ${gdpr.breach_incidents_ytd === 0 ? 'bg-green-900/20 border-green-700/40 text-green-400' : 'bg-red-900/20 border-red-700/40 text-red-400'}`}>
                {gdpr.breach_incidents_ytd === 0 ? '✓' : '⚠'} 0 Breaches YTD
              </div>
              <div className={`rounded-lg px-3 py-2 border ${gdpr.dpia_pending === 0 ? 'bg-green-900/20 border-green-700/40 text-green-400' : 'bg-amber-900/20 border-amber-700/40 text-amber-400'}`}>
                {gdpr.dpia_pending > 0 ? `⏳ ${gdpr.dpia_pending} DPIA Pending` : '✓ All DPIAs Done'}
              </div>
            </div>
          </div>

          {/* Security posture */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <div className="text-sm font-semibold text-white">Security Posture</div>
            <div className="grid grid-cols-2 gap-3 text-xs text-center">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className={`text-xl font-bold ${secPos.critical_cves_open === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {secPos.critical_cves_open ?? 0}
                </div>
                <div className="text-slate-500 mt-0.5">Critical CVEs</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className={`text-xl font-bold ${(secPos.high_cves_open ?? 0) === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {secPos.high_cves_open ?? 2}
                </div>
                <div className="text-slate-500 mt-0.5">High CVEs</div>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Last pen test</span>
                <span className="text-slate-300">{secPos.pen_test_last ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>SOC 2 Type II</span>
                <span className={`font-semibold ${secPos.soc2_status === 'Completed' ? 'text-green-400' : 'text-amber-400'}`}>
                  {secPos.soc2_status ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ISO 27001</span>
                <span className="text-amber-400">{secPos.iso27001_status ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Audit trail */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-2">
            <div className="text-sm font-semibold text-white">Audit Trail (30d)</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-700/50 rounded-lg p-2">
                <div className="font-bold text-white text-sm">{(auditTrail.events_30d ?? 4821).toLocaleString()}</div>
                <div className="text-slate-500">Events</div>
              </div>
              <div className={`rounded-lg p-2 ${(auditTrail.anomalous_events ?? 0) > 0 ? 'bg-amber-900/20' : 'bg-slate-700/50'}`}>
                <div className={`font-bold text-sm ${(auditTrail.anomalous_events ?? 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {auditTrail.anomalous_events ?? 0}
                </div>
                <div className="text-slate-500">Anomalous</div>
              </div>
              <div className={`rounded-lg p-2 ${(auditTrail.rbac_violations_7d ?? 0) > 0 ? 'bg-red-900/20' : 'bg-green-900/20'}`}>
                <div className={`font-bold text-sm ${(auditTrail.rbac_violations_7d ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {auditTrail.rbac_violations_7d ?? 0}
                </div>
                <div className="text-slate-500">RBAC Violations</div>
              </div>
            </div>
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
            Compliance Actions ({anomalies.length})
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

      {/* Engineer/Lead technical detail */}
      {(role === 'SENIOR' || role === 'JUNIOR' || role === 'LEAD') && engSum && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Compliance Data Detail</div>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{engSum}</pre>
        </div>
      )}
    </div>
  )
}
