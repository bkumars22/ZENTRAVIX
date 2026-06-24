'use client'

import { useState } from 'react'
import RagStatus from '@/components/shared/RagStatus'
import HealthScore from '@/components/shared/HealthScore'

interface Project {
  id: string; name: string; description: string; techStack: string; status: string
  healthScore: number; qaipScore: number; qaipPassRate: number; qaipP0Count: number
  openP0s: number; velocity: number; sprintNumber: number; releaseDate: string
  repoUrl: string; jiraKey: string
}

const SEED_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'SCIP — Supply Chain Intelligence Platform',
    description: 'AI-powered supply chain disruption predictor with 94% accuracy. Real-time anomaly detection using IsolationForest + LangGraph agents.',
    techStack: 'Java 17 · Spring Boot 3 · React 18 · Python FastAPI · LangGraph · PostgreSQL',
    status: 'ACTIVE',
    healthScore: 87,
    qaipScore: 95.7,
    qaipPassRate: 95.7,
    qaipP0Count: 1,
    openP0s: 1,
    velocity: 42,
    sprintNumber: 12,
    releaseDate: '2026-07-15',
    repoUrl: 'https://github.com/bkumars22/SupplyChainPlatformProject',
    jiraKey: 'SCIP',
  },
  {
    id: '2',
    name: 'ARIA — Adaptive Real-time Intelligence for Anyone',
    description: 'AI-powered adaptive learning platform with Socratic tutoring, voice interaction, and personalized learning paths.',
    techStack: 'Claude AI · LangGraph · React 18 · Spring Boot · Python FastAPI · Whisper STT',
    status: 'ACTIVE',
    healthScore: 94,
    qaipScore: 98.6,
    qaipPassRate: 98.6,
    qaipP0Count: 0,
    openP0s: 0,
    velocity: 46,
    sprintNumber: 8,
    releaseDate: '2026-07-01',
    repoUrl: 'https://github.com/bkumars22/ARIA',
    jiraKey: 'ARIA',
  },
  {
    id: '3',
    name: 'QAIP — QA Intelligent Platform',
    description: 'AI-powered QA platform that generates test suites, detects coverage gaps, and triggers automated regression runs.',
    techStack: 'Spring Boot · React · Python · Claude AI · PostgreSQL · Railway',
    status: 'ACTIVE',
    healthScore: 96,
    qaipScore: 99.1,
    qaipPassRate: 99.1,
    qaipP0Count: 0,
    openP0s: 0,
    velocity: 38,
    sprintNumber: 15,
    releaseDate: '2026-06-01',
    repoUrl: 'https://github.com/bkumars22/QA-Intelligent-Platform',
    jiraKey: 'QAIP',
  },
]

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AllProjectsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Project | null>(null)

  const filtered = SEED_PROJECTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.jiraKey.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ← All Projects
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-600/20 text-brand-400 font-mono">{selected.jiraKey}</span>
                  <h1 className="text-xl font-bold text-white mt-2">{selected.name}</h1>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{selected.description}</p>
                </div>
                <HealthScore score={selected.healthScore} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Tech Stack</div>
                <div className="text-slate-300 text-sm">{selected.techStack}</div>
              </div>
              <div className="mt-4">
                <a
                  href={selected.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm"
                >
                  View on GitHub →
                </a>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Current Sprint</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">#{selected.sprintNumber}</div>
                  <div className="text-xs text-slate-500">Sprint Number</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{selected.velocity}</div>
                  <div className="text-xs text-slate-500">Velocity (pts)</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${selected.openP0s > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {selected.openP0s}
                  </div>
                  <div className="text-xs text-slate-500">Open P0s</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">QAIP Quality</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Pass Rate</span>
                  <span className="text-sm font-bold text-green-400">{selected.qaipPassRate}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${selected.qaipPassRate}%` }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Open P0 Defects</span>
                  <span className={`text-sm font-bold ${selected.qaipP0Count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {selected.qaipP0Count}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Release</h2>
              <div className="text-xl font-bold text-white">{fmtDate(selected.releaseDate)}</div>
              <div className="text-xs text-slate-500 mt-1">Planned release date</div>
              <div className="mt-3">
                <RagStatus score={selected.healthScore} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Status</h2>
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                {selected.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">All Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">SCIP, ARIA, QAIP — integrated project intelligence</p>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-56"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 text-left transition-colors w-full"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-600/20 text-brand-400 font-mono">{p.jiraKey}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    p.openP0s > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}>
                    {p.openP0s > 0 ? `${p.openP0s} P0 Open` : 'No P0s'}
                  </span>
                </div>
                <div className="text-white font-semibold">{p.name}</div>
                <div className="text-slate-400 text-xs mt-1 line-clamp-2">{p.description}</div>
                <div className="text-slate-600 text-xs mt-2 font-mono">{p.techStack}</div>
              </div>
              <div className="flex flex-col items-end gap-3 ml-6 flex-shrink-0">
                <HealthScore score={p.healthScore} />
                <div className="text-right">
                  <div className={`text-sm font-bold ${p.qaipPassRate >= 97 ? 'text-green-400' : p.qaipPassRate >= 90 ? 'text-amber-400' : 'text-red-400'}`}>
                    {p.qaipPassRate}%
                  </div>
                  <div className="text-xs text-slate-500">QAIP pass</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{fmtDate(p.releaseDate)}</div>
                  <div className="text-xs text-slate-500">Release</div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
