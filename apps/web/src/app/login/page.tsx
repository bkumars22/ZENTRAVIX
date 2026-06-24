'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const ROLE_ROUTES: Record<string, string> = {
  CEO: '/dashboard/ceo',
  EXECUTIVE: '/dashboard/vp',
  VP: '/dashboard/vp',
  MANAGER: '/dashboard/manager',
  LEAD: '/dashboard/manager',
  SENIOR: '/dashboard/me',
  JUNIOR: '/dashboard/me',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Invalid credentials')
        return
      }

      const { token, user } = await res.json()

      document.cookie = `auranex_token=${token}; path=/; max-age=86400; SameSite=Lax`

      const destination = ROLE_ROUTES[user.role] ?? '/dashboard/me'
      router.push(destination)
    } catch {
      setError('Connection error. Please check the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 flex-col justify-between p-12">
        <div>
          <div className="text-3xl font-bold text-white tracking-tight">AURANEX</div>
          <div className="text-brand-200 text-sm mt-1">Organisation Intelligence Platform</div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Every role.<br />One platform.<br />Full visibility.
            </h2>
            <p className="mt-4 text-brand-200 text-lg">
              Real-time intelligence across SCIP, ARIA, and QAIP — tailored to your organisational level.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: 'CEO', text: 'Executive health scores across all projects in real-time' },
              { icon: 'VP', text: 'Budget, velocity, and team capacity at a glance' },
              { icon: 'DEV', text: 'QAIP-integrated test results and personal dashboards' },
            ].map((item) => (
              <div key={item.icon} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {item.icon}
                </div>
                <p className="text-brand-100 text-sm leading-relaxed pt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-brand-300 text-xs">
          Integrates with SCIP, ARIA, QAIP — connected via real-time webhooks
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <div className="text-2xl font-bold text-white">AURANEX</div>
            <div className="text-slate-400 text-sm">Organisation Intelligence Platform</div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Sign in to AURANEX</h1>
            <p className="mt-2 text-slate-400 text-sm">
              Access your role-specific intelligence dashboard
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-300 text-xs font-medium mb-2">Demo credentials:</p>
            <p className="text-brand-400 text-xs font-mono">ceo@auranex.io / Auranex@2026</p>
            <p className="text-slate-500 text-xs mt-1">
              Also available: cto, cfo, vp.eng, manager, senior.dev, junior.qa
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@auranex.io"
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-slate-600 text-xs text-center">
            AURANEX — Organisation Intelligence Platform — v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
