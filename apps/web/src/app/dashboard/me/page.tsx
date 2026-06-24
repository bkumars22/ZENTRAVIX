'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Task {
  id: string; title: string; status: string; priority: string; dueDate?: string; projectKey: string
}

interface PullRequest {
  id: string; title: string; githubPrNum: number; status: string; linesChanged: number; daysOpen: number; branch: string
  project?: { name: string; jiraKey: string }
}

interface QaipTestRun {
  runId: string; passRate: number; coverage: number; defects: number; branch: string; runAt: string
}

interface Timesheet {
  id: string; weekStart: string; totalHours: number; submitted: boolean
  entries: Array<{ day: string; project: string; hours: number }>
}

interface DashboardData {
  myTasks: Task[]
  myPRs: PullRequest[]
  myTestRun?: QaipTestRun
  myTimesheet?: Timesheet
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-700', label: 'P0' },
  MEDIUM: { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-700/50', label: 'P2' },
  LOW: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700', label: 'P3' },
}

function fmtDate(s: string) {
  const d = new Date(s)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'DUE TODAY'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'less than an hour ago'
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

export default function IndividualDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  function getToken() {
    return document.cookie.split('; ').find(r => r.startsWith('ZENTRAVIX_token='))?.split('=')[1] ?? ''
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/me/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } })
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

  const testRun = data?.myTestRun ?? {
    runId: 'qaip-run-20260623-001',
    passRate: 94.2,
    coverage: 88.4,
    defects: 2,
    branch: 'feature/auth-fix',
    runAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  }

  const timesheet = data?.myTimesheet ?? {
    id: 'ts-1',
    weekStart: '2026-06-16T00:00:00Z',
    totalHours: 32,
    submitted: false,
    entries: [
      { day: 'Monday', project: 'SCIP', hours: 8 },
      { day: 'Tuesday', project: 'SCIP', hours: 8 },
      { day: 'Wednesday', project: 'SCIP', hours: 6 },
      { day: 'Thursday', project: 'SCIP', hours: 6 },
      { day: 'Friday', project: 'ARIA Review', hours: 4 },
    ],
  }

  const tasks = data?.myTasks ?? []
  const prs = data?.myPRs ?? []

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* My Today */}
      <div>
        <h2 className="text-white font-semibold mb-3">My Today</h2>
        <div className="space-y-2">
          {tasks.length > 0 ? tasks.map((task) => {
            const style = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES['LOW']
            const isToday = task.dueDate && fmtDate(task.dueDate) === 'DUE TODAY'
            return (
              <div key={task.id} className={`rounded-xl p-4 border ${style.bg} ${style.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                      task.priority === 'HIGH' ? 'bg-red-600 text-white' :
                      task.priority === 'MEDIUM' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'
                    }`}>
                      {style.label}
                    </span>
                    <div>
                      <div className="text-white font-medium text-sm">{task.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{task.projectKey}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.status !== 'TODO' && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">{task.status.replace('_', ' ')}</span>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs font-medium ${isToday ? 'text-red-400' : 'text-slate-400'}`}>
                        {fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="space-y-2">
              <div className="rounded-xl p-4 border bg-red-900/20 border-red-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 bg-red-600 text-white">P0</span>
                    <div>
                      <div className="text-white font-medium text-sm">Fix P0 auth bypass in SCIP</div>
                      <div className="text-slate-500 text-xs mt-0.5">SCIP</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-red-400 flex-shrink-0">DUE TODAY</span>
                </div>
              </div>
              <div className="rounded-xl p-4 border bg-blue-900/20 border-blue-700/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 bg-blue-600 text-white">P2</span>
                    <div>
                      <div className="text-white font-medium text-sm">Write test cases for SCIP v2.4 auth module</div>
                      <div className="text-slate-500 text-xs mt-0.5">SCIP</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">IN PROGRESS</span>
                    <span className="text-xs font-medium text-slate-400">26 Jun</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4 border bg-slate-800 border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 bg-slate-600 text-white">P3</span>
                    <div>
                      <div className="text-white font-medium text-sm">Review ARIA Socratic engine drift test results</div>
                      <div className="text-slate-500 text-xs mt-0.5">ARIA</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400 flex-shrink-0">28 Jun</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My PRs */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">My Pull Requests</h2>
          {prs.length > 0 ? (
            <div className="space-y-2">
              {prs.map(pr => (
                <div key={pr.id} className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-200 text-sm font-medium">{pr.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>PR #{pr.githubPrNum}</span>
                    <span>{pr.linesChanged} lines</span>
                    <span>{pr.daysOpen}d open</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-500 text-sm">No open pull requests</div>
              <div className="text-slate-600 text-xs mt-1">Open your first PR to see results here</div>
            </div>
          )}
        </div>

        {/* QAIP Test Run */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">My Last QAIP Run</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Branch</span>
              <span className="text-brand-400 text-sm font-mono">{testRun.branch}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Pass Rate</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${testRun.passRate >= 95 ? 'text-green-400' : 'text-amber-400'}`}>
                  {testRun.passRate.toFixed(1)}%
                </span>
                {testRun.passRate < 95 && (
                  <span className="text-xs bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded">below 95% threshold</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Coverage</span>
              <span className="text-white text-sm font-medium">{testRun.coverage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Defects found</span>
              <span className="text-amber-400 text-sm font-medium">{testRun.defects} (1 P2, 1 P3)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Ran</span>
              <span className="text-slate-400 text-sm">{timeAgo(testRun.runAt)}</span>
            </div>
            <div className="pt-2">
              <div className="bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${testRun.passRate >= 95 ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${testRun.passRate}%` }}
                />
              </div>
            </div>
            <button className="w-full text-center text-brand-400 hover:text-brand-300 text-sm font-medium py-1 transition-colors">
              View Full Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timesheet */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">My Timesheet</h2>
            <span className="text-slate-400 text-xs">
              Week of {new Date(timesheet.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="space-y-2">
            {timesheet.entries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <span className="text-slate-300 text-sm">{entry.day}</span>
                  <span className="text-slate-500 text-xs ml-2">{entry.project}</span>
                </div>
                <span className="text-white text-sm font-medium">{entry.hours} hrs</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-700 mt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Total</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{timesheet.totalHours}</span>
                <span className="text-slate-400 text-sm">/ 40 hrs</span>
                {timesheet.totalHours < 40 && (
                  <span className="text-amber-400 text-xs">({40 - timesheet.totalHours} hrs remaining)</span>
                )}
              </div>
            </div>
            <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
              timesheet.submitted
                ? 'bg-green-900/40 text-green-400 border border-green-700 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 text-white'
            }`}>
              {timesheet.submitted ? 'Submitted' : 'Submit to Manager'}
            </button>
          </div>
        </div>

        {/* My Growth */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">My Growth</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 text-sm">Advanced Playwright Testing</span>
                <span className="text-brand-400 text-xs font-medium">60%</span>
              </div>
              <div className="bg-slate-700 rounded-full h-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '60%' }} />
              </div>
              <span className="text-slate-500 text-xs">Learning in progress</span>
            </div>

            <div className="bg-slate-900 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm font-medium">ISTQB Advanced</span>
                <span className="text-amber-400 text-xs">In Progress</span>
              </div>
              <div className="text-slate-500 text-xs mt-1">Est. completion: Aug 2026</div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Next performance review</span>
              <span className="text-slate-300 text-sm">Sep 2026</span>
            </div>

            <div className="bg-slate-900 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm font-medium">Contribution Score</span>
                <span className="text-green-400 text-lg font-bold">7.2</span>
              </div>
              <div className="text-slate-500 text-xs mt-0.5">/ 10 — Above average velocity this sprint</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
