'use client'

import { useState, useEffect } from 'react'
import type { RoleLevel } from '@/hooks/useWebSocket'

export type DeptTab = 'devops' | 'security' | 'finance' | 'product'

interface CriticalBadge { dept: string; severity: string; msg: string }

interface DepartmentLayoutProps {
  role:     RoleLevel
  children: (dept: DeptTab, role: RoleLevel) => React.ReactNode
}

const TAB_META: Record<DeptTab, { label: string; icon: string; desc: string }> = {
  devops:   { label: 'DevOps',   icon: '⚙️', desc: 'CI/CD · Railway Health · Deployments' },
  security: { label: 'Security', icon: '🔒', desc: 'deepeval · OWASP · RBAC Audit' },
  finance:  { label: 'Finance',  icon: '💰', desc: 'AI Costs · Infra Spend · Budget Tracking' },
  product:  { label: 'Product',  icon: '📊', desc: 'ARIA Sessions · QAIP Pipelines · SCIP Suppliers' },
}

const ROLE_LEVELS: RoleLevel[] = ['CEO', 'MANAGER', 'LEAD', 'SENIOR', 'JUNIOR']
const ROLE_COLOR: Record<string, string> = {
  CEO:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  MANAGER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  LEAD:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
  SENIOR:  'bg-green-500/20 text-green-300 border-green-500/30',
  JUNIOR:  'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

export default function DepartmentLayout({ role: initialRole, children }: DepartmentLayoutProps) {
  const [activeTab, setActiveTab] = useState<DeptTab>('devops')
  const [role,      setRole]      = useState<RoleLevel>(initialRole)
  const [alerts,    setAlerts]    = useState<CriticalBadge[]>([])

  // Listen for critical WebSocket alerts across all departments
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const d = e.detail as { department: string; severity: string; msg: string }
      setAlerts((prev) => [{ dept: d.department, severity: d.severity, msg: d.msg }, ...prev.slice(0, 4)])
    }
    window.addEventListener('zentravix:critical', handler as EventListener)
    return () => window.removeEventListener('zentravix:critical', handler as EventListener)
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* Top bar — role selector only (sidebar already shows ZENTRAVIX brand) */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <span className="text-sm font-semibold text-slate-300">Department Intelligence</span>
          <div className="flex items-center gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleLevel)}
              className="text-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {ROLE_LEVELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <span className={`text-xs font-semibold px-2 py-1 rounded border ${ROLE_COLOR[role] ?? ''}`}>
              {role} VIEW
            </span>
          </div>
        </div>
      </div>

      {/* Critical alert banner */}
      {alerts.length > 0 && (
        <div className="bg-red-900/30 border-b border-red-700/50 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            <span className="text-red-400 font-bold text-xs animate-pulse">🚨 CRITICAL ALERT</span>
            {alerts.slice(0, 3).map((a, i) => (
              <span key={i} className="text-xs text-red-300 bg-red-900/40 px-2 py-0.5 rounded">
                [{a.dept.toUpperCase()}] {a.severity}: {a.msg}
              </span>
            ))}
            <button onClick={() => setAlerts([])} className="ml-auto text-red-400 hover:text-red-200 text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-slate-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-1 pt-2">
          {(Object.entries(TAB_META) as [DeptTab, typeof TAB_META[DeptTab]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                activeTab === key
                  ? 'text-blue-400 border-blue-400 bg-slate-800'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="mr-1.5">{meta.icon}</span>
              {meta.label}
              <span className="ml-2 text-xs text-slate-500 hidden md:inline">{meta.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children(activeTab, role)}
      </div>
    </div>
  )
}
