'use client'

import { useState, useEffect } from 'react'

interface OrgAIAssistantProps {
  role: string
  department?: string
}

const EXAMPLE_QUESTIONS: Record<string, string[]> = {
  CEO:      ['Why is SCIP delayed?', 'What is our revenue status?', 'Which project is on track?'],
  EXECUTIVE:['Which module has most defects?', 'QAIP coverage summary?', 'Sprint velocity trend?'],
  VP:       ['Team capacity this sprint?', 'Which tests are failing?', 'Budget utilisation?'],
  MANAGER:  ['Who are the blockers?', 'Which PRs need review?', 'Sprint completion rate?'],
  LEAD:     ['PR review backlog?', 'Sprint blockers for my team?', 'Velocity vs last sprint?'],
  SENIOR:   ['Open defects in my module?', 'Test coverage for auth?', 'My sprint tasks?'],
  JUNIOR:   ['What is P0 bug status?', 'How is QAIP pass rate?', 'Which tests failed today?'],
}

const AI_ENDPOINT = process.env.NEXT_PUBLIC_AI_URL || ''

export default function OrgAIAssistant({ role, department }: OrgAIAssistantProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [history, setHistory]   = useState<{ q: string; a: string }[]>([])

  const examples = EXAMPLE_QUESTIONS[role] || EXAMPLE_QUESTIONS.MANAGER

  const ask = async (q?: string) => {
    const finalQ = (q ?? question).trim()
    if (!finalQ || loading) return
    setQuestion(finalQ)
    setLoading(true)
    setAnswer('')
    try {
      const params = new URLSearchParams({ question: finalQ, user_role: role })
      if (department) params.set('department', department)
      const res = await fetch(`${AI_ENDPOINT}/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQ, domain: undefined, top_k: 6 }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const results: { content: string }[] = data.results || []
      const combined = results.map(r => r.content).join('\n\n')
      const answerText = combined || 'No relevant organisation data found for this query.'
      setAnswer(answerText)
      setHistory(h => [...h.slice(-4), { q: finalQ, a: answerText }])
    } catch (e: any) {
      setAnswer('Unable to reach ZENTRAVIX AI. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg">
          Z
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">ZENTRAVIX AI</h3>
          <p className="text-slate-500 text-xs">Organisation intelligence — ask anything as {role}</p>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && ask()}
          placeholder={`Ask as ${role}...`}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg
                     px-4 py-2.5 text-white text-sm placeholder-slate-500
                     focus:border-indigo-500 focus:outline-none transition"
        />
        <button
          onClick={() => ask()}
          disabled={loading || !question.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                     text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {loading ? (
            <span className="inline-block animate-pulse">...</span>
          ) : (
            'Ask'
          )}
        </button>
      </div>

      {/* Example questions */}
      <div className="flex flex-wrap gap-2">
        {examples.map(q => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-800
                       hover:bg-slate-700 px-3 py-1 rounded-full border border-slate-700
                       hover:border-indigo-600 transition disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Answer */}
      {answer && (
        <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-200
                        leading-relaxed border-l-2 border-indigo-500 whitespace-pre-wrap">
          {answer}
        </div>
      )}

      {/* Recent history (last 3 turns) */}
      {history.length > 1 && (
        <details className="text-xs text-slate-500 mt-2">
          <summary className="cursor-pointer hover:text-slate-400">
            Recent questions ({history.length - 1})
          </summary>
          <div className="mt-2 space-y-2">
            {history.slice(0, -1).reverse().map((h, i) => (
              <button
                key={i}
                onClick={() => ask(h.q)}
                className="block w-full text-left truncate text-slate-500
                           hover:text-slate-300 transition"
              >
                {h.q}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
