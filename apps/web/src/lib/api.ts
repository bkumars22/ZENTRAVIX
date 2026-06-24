const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function fetchDashboard(role: string, token: string) {
  const endpoints: Record<string, string> = {
    CEO: '/api/ceo/dashboard',
    EXECUTIVE: '/api/vp/dashboard',
    VP: '/api/vp/dashboard',
    MANAGER: '/api/manager/dashboard',
    LEAD: '/api/manager/dashboard',
    SENIOR: '/api/me/dashboard',
    JUNIOR: '/api/me/dashboard',
  }
  const endpoint = endpoints[role] ?? '/api/me/dashboard'
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch dashboard data')
  return res.json()
}

export async function queryAi(question: string, token: string): Promise<{ answer: string }> {
  const res = await fetch(`${API_URL}/api/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) throw new Error('AI query failed')
  return res.json()
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Login failed')
  }
  return res.json() as Promise<{ token: string; user: { id: string; email: string; name: string; role: string; title: string } }>
}
