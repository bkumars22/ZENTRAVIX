'use client'

import { useWebSocket } from '@/hooks/useWebSocket'
import { useRole } from '@/hooks/useRole'

export default function Header({ title }: { title: string }) {
  const { user } = useRole()
  const { connected } = useWebSocket(user?.role ?? '')

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-white font-semibold text-base">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-600'}`} />
          {connected ? 'Live' : 'Offline'}
        </div>
        <div className="text-slate-500 text-xs">
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  )
}
