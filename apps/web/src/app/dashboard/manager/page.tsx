'use client'

import { useState, useEffect } from 'react'
import RagStatus from '@/components/shared/RagStatus'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface TeamMember {
  id: string; name: string; title: string; tasksToday: number
  prsOpen: number; hoursThisWeek: number; status: string; aiFlag?: string
}

interface Sprint {
  name: string; committedPoints: number; completedPoints: number; velocity: number
}

interface Task {
  id: string; title: string; status: string; priority: string; dueDate?: string
  projectKey: string; assignee?: { name: string; title: string }
}

interface Alert {
  id: string; severity: string; message: string; actionNeeded: string
}

interface DashboardData {
  team: TeamMember[]
  tasks: Task[]
  sprint: Sprint
  alerts: Alert[]
  burndown: { totalPoints: number; completedPoints: number; daysRemaining: number }
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  ON_TRACK: { dot: 'bg-green-500', label: 'On Track' },
  BLOCKED: { dot: 'bg-red-500', label: 'Blocked' },
  AT_RISK: { dot: 'bg-amber-500', label: 'At Risk' },
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: 'border-l-red-500',
  MEDIUM: 'border-l-amber-500',
  LOW: 'border-l-slate-600',
}

function fmtDate(s: string) {
  const d = new Date(s)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function ManagerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStandup, setShowStandup] = useState(false)

  function getToken() {
    return document.cookie.split('; ').find(r => r.startsWith('ZENTRAVIX_token='))?.split('=')[1] ?? ''
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/manager/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } })
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

  const sprint = data?.sprint
  const burndownPct = sprint ? Math.round((sprint.completedPoints / sprint.committedPoints) * 100) : 64
  const burndown = data?.burndown ?? { totalPoints: 50, completedPoints: 32, daysRemaining: 3 }

  // Kanban columns derived from tasks
  const todoTasks = (data?.tasks ?? []).filter(t => t.status === 'TODO')
  const inProgressTasks = (data?.tasks ?? []).filter(t => t.status === 'IN_PROGRESS')
  const reviewTasks = (data?.tasks ?? []).filter(t => t.status === 'REVIEW')
  const doneTasks = (data?.tasks ?? []).filter(t => t.status === 'DONE')

  const standupReport = `ZENTRAVIX Engineering Team — Daily Standup — ${new Date().toLocaleDateString('en-IN')}

Completed Yesterday:
- Docker Compose health checks (Rahul Shah)
- ARIA Socratic engine test suite (Meera Iyer)

In Progress Today:
- Fix P0 auth bypass in SCIP (Arjun Patel) — CRITICAL, due today
- SCIP v2.4 auth module test cases (Arjun Patel)
- API rate limiting implementation (Meera Iyer)
- Database query optimization (Rahul Shah)

Blockers:
- Arjun Patel: blocked on Platform team dependency for 3 days — needs escalation
- Priya Singh: 3 PRs open >48hrs, needs reviewer assignment

Sprint #12 — 3 days remaining — 64% complete (32/50 points)
AI Prediction: 8 points at risk of not completing — recommend scope discussion.`

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Engineering team — Sprint #{sprint?.name ?? '12'}</p>
        </div>
        <button
          onClick={() => setShowStandup(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Generate AI Standup
        </button>
      </div>

      {/* Sprint Tracker */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">{sprint?.name ?? 'Sprint 12'}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{burndown.daysRemaining} days remaining</p>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-lg">{burndown.completedPoints}/{burndown.totalPoints}</div>
            <div className="text-slate-400 text-xs">story points</div>
          </div>
        </div>
        <div className="bg-slate-700 rounded-full h-3">
          <div className="bg-brand-600 h-3 rounded-full transition-all" style={{ width: `${burndownPct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>{burndownPct}% complete</span>
          <span className="text-amber-400">AI: {burndown.totalPoints - burndown.completedPoints - 8} pts on track, 8 pts at risk</span>
        </div>
      </div>

      {/* Alerts */}
      {(data?.alerts ?? []).length > 0 && (
        <div className="space-y-2">
          {(data?.alerts ?? []).map(alert => (
            <div key={alert.id} className={`rounded-lg p-3 border ${
              alert.severity === 'WARNING' ? 'bg-amber-900/20 border-amber-700' : 'bg-blue-900/20 border-blue-700'
            }`}>
              <div className="flex gap-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  alert.severity === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                }`}>{alert.severity}</span>
                <div>
                  <p className="text-slate-200 text-sm">{alert.message}</p>
                  {alert.actionNeeded && <p className="text-slate-400 text-xs mt-0.5">{alert.actionNeeded}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      <div>
        <h2 className="text-white font-semibold mb-3">Task Board</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TO DO */}
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
              TO DO
              <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            <div className="space-y-2">
              {todoTasks.map(task => (
                <div key={task.id} className={`bg-slate-800 border border-l-4 ${PRIORITY_COLOR[task.priority] ?? 'border-l-slate-600'} border-slate-700 rounded-lg p-3`}>
                  <div className="text-slate-200 text-sm font-medium leading-snug">{task.title}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-500 text-xs">{task.assignee?.name ?? '—'}</span>
                    {task.dueDate && (
                      <span className={`text-xs font-medium ${fmtDate(task.dueDate) === 'Today' ? 'text-red-400' : 'text-slate-400'}`}>
                        {fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      task.priority === 'HIGH' ? 'bg-red-900/40 text-red-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
              {/* Static cards for demo */}
              {todoTasks.length === 0 && (
                <div className="bg-slate-800 border border-l-4 border-l-red-500 border-slate-700 rounded-lg p-3">
                  <div className="text-slate-200 text-sm font-medium">Fix P0 auth bypass in SCIP</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-500 text-xs">Arjun Patel</span>
                    <span className="text-red-400 text-xs font-medium">Today</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-900/40 text-red-400">HIGH</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* IN PROGRESS */}
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
              IN PROGRESS
              <span className="bg-blue-900/40 text-blue-400 text-xs px-1.5 py-0.5 rounded-full">{inProgressTasks.length || 3}</span>
            </div>
            <div className="space-y-2">
              {[
                { title: 'SCIP v2.4 auth module test cases', assignee: 'Arjun Patel', priority: 'MEDIUM' },
                { title: 'API rate limiting implementation', assignee: 'Meera Iyer', priority: 'HIGH' },
                { title: 'Database query optimization', assignee: 'Rahul Shah', priority: 'MEDIUM' },
                ...inProgressTasks.map(t => ({ title: t.title, assignee: t.assignee?.name ?? '—', priority: t.priority })),
              ].slice(0, 3).map((task, i) => (
                <div key={i} className={`bg-slate-800 border border-l-4 ${PRIORITY_COLOR[task.priority]} border-slate-700 rounded-lg p-3`}>
                  <div className="text-slate-200 text-sm font-medium leading-snug">{task.title}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-500 text-xs">{task.assignee}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-slate-700 text-slate-400">{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REVIEW */}
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
              REVIEW
              <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{reviewTasks.length || 1}</span>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-800 border border-l-4 border-l-amber-500 border-amber-700/50 rounded-lg p-3">
                <div className="text-slate-200 text-sm font-medium">JWT refresh token flow</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-500 text-xs">Priya Singh</span>
                  <span className="text-amber-400 text-xs font-medium">PR #127 — 72hrs</span>
                </div>
                <div className="mt-1 text-amber-400 text-xs">Needs reviewer assignment</div>
              </div>
            </div>
          </div>

          {/* DONE */}
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
              DONE
              <span className="bg-green-900/40 text-green-400 text-xs px-1.5 py-0.5 rounded-full">{doneTasks.length || 2}</span>
            </div>
            <div className="space-y-2 opacity-70">
              {[
                { title: 'Docker Compose health checks', assignee: 'Rahul Shah' },
                { title: 'ARIA Socratic engine test suite', assignee: 'Meera Iyer' },
              ].map((task, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-sm font-medium line-through">{task.title}</div>
                  <span className="text-slate-600 text-xs mt-1 block">{task.assignee}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Health Panel */}
      <div>
        <h2 className="text-white font-semibold mb-3">Team Health</h2>
        <div className="space-y-3">
          {(data?.team ?? []).map((member) => {
            const statusCfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG['ON_TRACK']
            return (
              <div key={member.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{member.name}</div>
                      <div className="text-slate-400 text-xs">{member.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                    <span className={`text-xs font-medium ${
                      member.status === 'ON_TRACK' ? 'text-green-400' :
                      member.status === 'BLOCKED' ? 'text-red-400' : 'text-amber-400'
                    }`}>{statusCfg.label}</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-white font-bold">{member.tasksToday}</div>
                    <div className="text-slate-500 text-xs">Tasks</div>
                  </div>
                  <div>
                    <div className="text-white font-bold">{member.prsOpen}</div>
                    <div className="text-slate-500 text-xs">PRs Open</div>
                  </div>
                  <div>
                    <div className="text-white font-bold">{member.hoursThisWeek}</div>
                    <div className="text-slate-500 text-xs">Hrs/Week</div>
                  </div>
                </div>
                {member.aiFlag && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className={`text-xs ${member.status === 'BLOCKED' ? 'text-red-400' : 'text-amber-400'}`}>
                      AI: {member.aiFlag}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Standup Modal */}
      {showStandup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold">AI Standup Report</h3>
              <button onClick={() => setShowStandup(false)} className="text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="p-5">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono bg-slate-900 rounded-lg p-4 overflow-y-auto max-h-96">
                {standupReport}
              </pre>
              <div className="flex gap-3 mt-4">
                <button className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Copy to Clipboard
                </button>
                <button onClick={() => setShowStandup(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium py-2 rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
