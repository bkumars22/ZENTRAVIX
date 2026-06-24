import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default function DashboardRedirect() {
  const session = getSession()
  if (!session) redirect('/login')

  const ROLE_ROUTES: Record<string, string> = {
    CEO: '/dashboard/ceo',
    EXECUTIVE: '/dashboard/vp',
    VP: '/dashboard/vp',
    MANAGER: '/dashboard/manager',
    LEAD: '/dashboard/manager',
    SENIOR: '/dashboard/me',
    JUNIOR: '/dashboard/me',
  }

  redirect(ROLE_ROUTES[session.role] ?? '/dashboard/me')
}
