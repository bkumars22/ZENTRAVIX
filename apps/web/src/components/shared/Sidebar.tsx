'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'

interface NavItem {
  label: string
  href: string
  minLevel: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'CEO Dashboard', href: '/dashboard/ceo', minLevel: 7 },
  { label: 'VP Overview', href: '/dashboard/vp', minLevel: 6 },
  { label: 'Manager Dashboard', href: '/dashboard/manager', minLevel: 4 },
  { label: 'My Dashboard', href: '/dashboard/me', minLevel: 1 },
  { label: 'All Projects', href: '/dashboard/projects', minLevel: 5 },
]

const ROLE_COLORS: Record<string, string> = {
  CEO: 'bg-purple-600 text-purple-100',
  EXECUTIVE: 'bg-blue-600 text-blue-100',
  VP: 'bg-indigo-600 text-indigo-100',
  MANAGER: 'bg-green-700 text-green-100',
  LEAD: 'bg-teal-700 text-teal-100',
  SENIOR: 'bg-slate-600 text-slate-200',
  JUNIOR: 'bg-slate-700 text-slate-300',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, roleLevel } = useRole()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.minLevel === 7 && roleLevel >= 7) return true
    if (item.minLevel === 6 && roleLevel >= 6) return true
    if (item.minLevel === 5 && roleLevel >= 5) return true
    if (item.minLevel === 4 && roleLevel >= 4) return true
    if (item.minLevel === 1) return true
    return false
  })

  function handleLogout() {
    document.cookie = 'ZENTRAVIX_token=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-slate-800">
        <div className="text-xl font-bold text-white tracking-tight">ZENTRAVIX</div>
        <div className="text-slate-500 text-xs mt-0.5">Organisation Intelligence</div>
      </div>

      {user && (
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.name}</div>
              <div className="text-slate-400 text-xs truncate">{user.title}</div>
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-slate-700 text-slate-300'}`}>
              {user.role}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
