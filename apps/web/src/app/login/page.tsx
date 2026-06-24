'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const ROLE_ROUTES: Record<string, string> = {
  CEO: '/dashboard/ceo',
  EXECUTIVE: '/dashboard/vp',
  VP: '/dashboard/vp',
  MANAGER: '/dashboard/manager',
  LEAD: '/dashboard/manager',
  SENIOR: '/dashboard/me',
  JUNIOR: '/dashboard/me',
}

// Demo users — frontend-only demo mode (no backend required)
const DEMO_USERS: Record<string, { password: string; name: string; title: string; role: string }> = {
  'ceo@zentravix.io':       { password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'Chief Executive Officer',    role: 'CEO' },
  'cto@zentravix.io':       { password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'Chief Technology Officer',   role: 'EXECUTIVE' },
  'cfo@zentravix.io':       { password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'Chief Financial Officer',    role: 'EXECUTIVE' },
  'vp.eng@zentravix.io':    { password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'VP Engineering',             role: 'VP' },
  'manager@zentravix.io':   { password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'Engineering Manager',        role: 'MANAGER' },
  'senior.dev@zentravix.io':{ password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'Senior Software Engineer',   role: 'SENIOR' },
  'junior.qa@zentravix.io': { password: 'Zentravix@2026', name: 'KumaraSwamy B', title: 'QA Engineer',                role: 'JUNIOR' },
}

function makeDemoToken(user: { name: string; title: string; role: string; email: string }) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      id: 'demo-' + user.role.toLowerCase(),
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    })
  ).replace(/=/g, '')
  return `${header}.${payload}.demo-sig`
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

    const normalizedEmail = email.trim().toLowerCase()

    try {
      // Try real API first if URL configured
      if (API_URL) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
        })

        if (res.ok) {
          const { token, user } = await res.json()
          document.cookie = `ZENTRAVIX_token=${token}; path=/; max-age=86400; SameSite=Lax`
          router.push(ROLE_ROUTES[user.role] ?? '/dashboard/me')
          return
        }
      }

      // Demo mode — validate against local user list
      const demo = DEMO_USERS[normalizedEmail]
      if (demo && demo.password === password) {
        const token = makeDemoToken({ ...demo, email: normalizedEmail })
        document.cookie = `ZENTRAVIX_token=${token}; path=/; max-age=86400; SameSite=Lax`
        router.push(ROLE_ROUTES[demo.role] ?? '/dashboard/me')
        return
      }

      setError('Invalid email or password.')
    } catch {
      // Network error — fall through to demo mode
      const demo = DEMO_USERS[normalizedEmail]
      if (demo && demo.password === password) {
        const token = makeDemoToken({ ...demo, email: normalizedEmail })
        document.cookie = `ZENTRAVIX_token=${token}; path=/; max-age=86400; SameSite=Lax`
        router.push(ROLE_ROUTES[demo.role] ?? '/dashboard/me')
        return
      }
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 flex-col justify-between p-12">
        <div>
          <div className="text-3xl font-bold text-white tracking-tight">ZENTRAVIX</div>
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
            <div className="text-2xl font-bold text-white">ZENTRAVIX</div>
            <div className="text-slate-400 text-sm">Organisation Intelligence Platform</div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Sign in to ZENTRAVIX</h1>
            <p className="mt-2 text-slate-400 text-sm">
              Access your role-specific intelligence dashboard
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-300 text-xs font-medium mb-2">Demo credentials:</p>
            <p className="text-brand-400 text-xs font-mono">ceo@zentravix.io / Zentravix@2026</p>
            <p className="text-slate-500 text-xs mt-1">
              Also: cto, cfo, vp.eng, manager, senior.dev, junior.qa @zentravix.io
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
                placeholder="you@zentravix.io"
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
            ZENTRAVIX — Organisation Intelligence Platform — v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
