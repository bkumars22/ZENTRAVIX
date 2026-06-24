import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Sidebar from '@/components/shared/Sidebar'

function getTokenFromCookies(): string | null {
  const token = cookies().get('ZENTRAVIX_token')?.value
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return token
  } catch {
    return null
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = getTokenFromCookies()
  if (!token) redirect('/login')

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
