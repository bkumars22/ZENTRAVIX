'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
      const parts = token.split('.')
      if (parts.length !== 3) { router.replace('/login'); return }
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        document.cookie = 'ZENTRAVIX_token=; path=/; max-age=0'
        router.replace('/login')
      }
    } catch {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
