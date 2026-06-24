import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  title: string
}

export function getSession(): SessionUser | null {
  const token = cookies().get('auranex_token')?.value
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload as SessionUser
  } catch {
    return null
  }
}
