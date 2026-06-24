'use client'

import { useEffect, useState } from 'react'

interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  title: string
}

export function useRole() {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('auranex_token='))
      ?.split('=')[1]

    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      setUser(payload as SessionUser)
    } catch {
      setUser(null)
    }
  }, [])

  const roleLevel = (() => {
    const levels: Record<string, number> = {
      JUNIOR: 1, SENIOR: 2, LEAD: 3, MANAGER: 4, VP: 5, EXECUTIVE: 6, CEO: 7,
    }
    return levels[user?.role ?? ''] ?? 0
  })()

  return { user, roleLevel }
}
