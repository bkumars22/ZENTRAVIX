'use client'

import { useState, useEffect } from 'react'
import RagStatus from '@/components/shared/RagStatus'
import SparkLine from '@/components/charts/SparkLine'
import DonutChart from '@/components/charts/DonutChart'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmtCr(n: number) {
  if (n >= 10000000) return `Rs.${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `Rs.${(n / 100000).toFixed(0)}L`
  return `Rs.${n}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Project {
  id: string; name: string; status: string; sprintNumber: number; velocity: number
  qaipScore: number; qaipPassRate: number; openP0s: number; releaseDate?: string; healthScore: number
}

interface Budget {
  id: string; category: string; allocated: number; spent: number
}

interface Sprint {
  id: string; name: string; velocity: number
}

interface Release {
  id: string; version: string; plannedDate: string; status: string; p0Count: number; projectName?: string; qaipScore: number
}

interface DashboardData {
  projects: Project[]
  budgets: Budget[]
  sprints: Sprint[]
  alerts: Array<{ id: string; severity: string; message: string; actionNeeded: string }>
  teamCapacity: { available: number; committed: number }
  headcount: number
  hiringPipeline: { open: number; interviews: number; offers: number }
  releases: Release[]
}

const TABS = ['Overview', 'Projects', 'Budget', 'Team', 'Releases']

export default function VpDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')

  function getToken() {
    return document.cookie.split('; ').find(r => r.startsWith('auranex_token='))?.split('=')[1] ?? ''
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/vp/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } })
        if (res.ok) setData(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const velocityData = data?.sprints.map(s => s.velocity) ?? [38, 44, 40, 48, 45, 46, 44, 42]
  const budgetTotal = data?.budgets.reduce((s, b) => s + b.allocated, 0) ?? 80000000
  const budgetSpent = data?.budgets.reduce((s, b) => s + b.spent, 0) ?? 52000000
  const capacityPct = data ? Math.round((data.teamCapacity.committed / data.teamCapacity.available) * 100) : 82

  const capacityData = [
    { name: 'Committed', value: data?.teamCapacity.committed ?? 1520, color: '#4F46E5' },
    { name: 'Available', value: (data?.teamCapacity.available ?? 1840) - (data?.teamCapacity.committed ?? 1520), color: '#1E293B' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">VP Engineering Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Technology division — Q2 2026</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* OKR Cards */}
          <div>
            <h2 className="text-white font-semibold mb-3">Q2 OKR Progress</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Ship SCIP v2.4', progress: 73, color: 'bg-amber-500' },
                { label: 'QAIP Integration', progress: 90, color: 'bg-green-500' },
                { label: 'Hire 8 Engineers', progress: 62, color: 'bg-blue-500' },
                { label: 'Q3 Revenue Pipeline', progress: 84, color: 'bg-purple-500' },
              ].map((okr) => (
                <div key={okr.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-slate-300 text-sm font-medium">{okr.label}</div>
                  <div className="text-white text-2xl font-bold mt-2">{okr.progress}%</div>
                  <div className="mt-2 bg-slate-700 rounded-full h-1.5">
                    <div className={`${okr.color} h-1.5 rounded-full transition-all`} style={{ width: `${okr.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Velocity Sparkline */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Sprint Velocity (last 8 sprints)</h2>
                <span className="text-brand-400 text-sm font-bold">{velocityData[velocityData.length - 1]}</span>
              </div>
              <SparkLine data={velocityData} color="#4F46E5" height={80} />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Sprint 5</span>
                <span>Sprint 12</span>
              </div>
            </div>

            {/* Team Capacity */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">Team Capacity</h2>
              <div className="flex items-center gap-6">
                <DonutChart data={capacityData} size={140} innerRadius={40} outerRadius={60} />
                <div className="space-y-3">
                  <div>
                    <div className="text-white font-bold text-xl">{capacityPct}%</div>
                    <div className="text-slate-400 text-xs">Committed</div>
                  </div>
                  <div>
                    <div className="text-slate-300 text-sm">{data?.teamCapacity.committed ?? 1520} hrs committed</div>
                    <div className="text-slate-500 text-xs">of {data?.teamCapacity.available ?? 1840} hrs available</div>
                  </div>
                  <div>
                    <div className="text-slate-300 text-sm">{(data?.teamCapacity.available ?? 1840) - (data?.teamCapacity.committed ?? 1520)} hrs free</div>
                    <div className="text-slate-500 text-xs">this quarter</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(data?.alerts ?? []).length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">Active Alerts</h2>
              <div className="space-y-2">
                {(data?.alerts ?? []).map((alert) => (
                  <div key={alert.id} className={`rounded-lg p-3 border ${
                    alert.severity === 'WARNING' ? 'bg-amber-900/20 border-amber-700' : 'bg-green-900/20 border-green-700'
                  }`}>
                    <div className="flex gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        alert.severity === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-green-600 text-white'
                      }`}>{alert.severity}</span>
                      <p className="text-slate-200 text-sm">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'Projects' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-700">
            <h2 className="text-white font-semibold">All Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Name', 'Status', 'Sprint', 'Velocity', 'QAIP Score', 'Coverage', 'Open P0s', 'Release Date', 'Health'].map((h) => (
                    <th key={h} className="text-left text-slate-400 text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {(data?.projects ?? []).map((p) => {
                  const rag: 'GREEN' | 'AMBER' | 'RED' = p.openP0s > 0 ? 'AMBER' : p.healthScore >= 80 ? 'GREEN' : 'RED'
                  return (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded">{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">#{p.sprintNumber}</td>
                      <td className="px-4 py-3 text-slate-300">{p.velocity}</td>
                      <td className="px-4 py-3 text-slate-300">{p.qaipScore.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-slate-300">{p.qaipPassRate.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${p.openP0s > 0 ? 'text-red-400' : 'text-green-400'}`}>{p.openP0s}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.releaseDate ? fmtDate(p.releaseDate) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <RagStatus status={rag} label={`${p.healthScore}`} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'Budget' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Total Allocated</div>
              <div className="text-2xl font-bold text-white mt-2">{fmtCr(budgetTotal)}</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Total Spent</div>
              <div className="text-2xl font-bold text-amber-400 mt-2">{fmtCr(budgetSpent)}</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Utilisation</div>
              <div className="text-2xl font-bold text-white mt-2">{Math.round((budgetSpent / budgetTotal) * 100)}%</div>
              <div className="mt-2 bg-slate-700 rounded-full h-1.5">
                <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${Math.round((budgetSpent / budgetTotal) * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Budget by Category</h2>
            <div className="space-y-3">
              {(data?.budgets ?? [
                { id: '1', category: 'People', allocated: 38000000, spent: 38000000 },
                { id: '2', category: 'Cloud', allocated: 18000000, spent: 6000000 },
                { id: '3', category: 'Tools', allocated: 12000000, spent: 4000000 },
                { id: '4', category: 'Training', allocated: 6000000, spent: 2000000 },
                { id: '5', category: 'Other', allocated: 6000000, spent: 2000000 },
              ]).map((b) => {
                const pct = Math.round((b.spent / b.allocated) * 100)
                return (
                  <div key={b.id} className="flex items-center gap-4">
                    <div className="w-24 text-slate-300 text-sm">{b.category}</div>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-brand-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="w-28 text-right text-slate-300 text-sm">{fmtCr(b.spent)} / {fmtCr(b.allocated)}</div>
                    <div className="w-10 text-right text-xs text-slate-400">{pct}%</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700 rounded-lg">
              <p className="text-amber-300 text-xs">
                AI Forecast: At current cloud spend trajectory, Q4 budget will be exceeded by Rs.12L — recommend review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'Team' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Total Headcount</div>
              <div className="text-3xl font-bold text-white mt-2">{data?.headcount ?? 47}</div>
              <div className="space-y-1 mt-3">
                {[{ label: 'Engineering', count: 32 }, { label: 'QA', count: 8 }, { label: 'DevOps', count: 7 }].map(d => (
                  <div key={d.label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{d.label}</span>
                    <span className="text-white">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Hiring Pipeline</div>
              <div className="space-y-3 mt-3">
                {[
                  { label: 'Open Roles', value: data?.hiringPipeline.open ?? 8, color: 'text-white' },
                  { label: 'In Interviews', value: data?.hiringPipeline.interviews ?? 12, color: 'text-blue-400' },
                  { label: 'Offers Pending', value: data?.hiringPipeline.offers ?? 3, color: 'text-amber-400' },
                ].map(h => (
                  <div key={h.label} className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">{h.label}</span>
                    <span className={`text-xl font-bold ${h.color}`}>{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Top Skills</div>
              <div className="space-y-2 mt-3">
                {[
                  { skill: 'Java', count: 28 },
                  { skill: 'React', count: 22 },
                  { skill: 'Python', count: 18 },
                  { skill: 'Cloud', count: 15 },
                  { skill: 'Testing', count: 12 },
                ].map(s => (
                  <div key={s.skill} className="flex items-center gap-2">
                    <span className="text-slate-300 text-sm w-16">{s.skill}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(s.count / 28) * 100}%` }} />
                    </div>
                    <span className="text-slate-400 text-xs w-6 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Releases Tab */}
      {activeTab === 'Releases' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-700">
            <h2 className="text-white font-semibold">Release Timeline</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {(data?.releases ?? []).map((r) => {
              const rag: 'GREEN' | 'AMBER' | 'GREY' = r.status === 'PLANNED' ? 'GREY' : r.p0Count > 0 ? 'AMBER' : 'GREEN'
              return (
                <div key={r.id} className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-white font-medium">{r.projectName} {r.version}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{fmtDate(r.plannedDate)}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      r.status === 'IN_PROGRESS' ? 'bg-blue-900/40 text-blue-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {r.status.replace('_', ' ')}
                    </span>
                    <RagStatus status={rag} size="sm" />
                  </div>
                  <div className="flex items-center gap-4">
                    {r.qaipScore > 0 && (
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">{r.qaipScore.toFixed(1)}%</div>
                        <div className="text-slate-500 text-xs">QAIP score</div>
                      </div>
                    )}
                    {r.status === 'IN_PROGRESS' && (
                      <button className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                        Run QAIP
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
