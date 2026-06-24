'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_ROUTES: Record<string, string> = {
  CEO: '/dashboard/ceo',
  EXECUTIVE: '/dashboard/vp',
  VP: '/dashboard/vp',
  MANAGER: '/dashboard/manager',
  LEAD: '/dashboard/manager',
  SENIOR: '/dashboard/me',
  JUNIOR: '/dashboard/me',
}

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((r) => r.startsWith('ZENTRAVIX_token='))
      ?.split('=')[1]

    if (!token) {
      router.replace('/login')
      return
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      router.replace(ROLE_ROUTES[payload.role as string] ?? '/dashboard/me')
    } catch {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading dashboard...</div>
    </div>
  )
}
