interface RagStatusProps {
  status: 'RED' | 'AMBER' | 'GREEN' | 'GREY'
  label?: string
  size?: 'sm' | 'md'
}

const CONFIG = {
  RED: { bg: 'bg-red-900/40', border: 'border-red-700', text: 'text-red-400', dot: 'bg-red-500' },
  AMBER: { bg: 'bg-amber-900/40', border: 'border-amber-700', text: 'text-amber-400', dot: 'bg-amber-500' },
  GREEN: { bg: 'bg-green-900/40', border: 'border-green-700', text: 'text-green-400', dot: 'bg-green-500' },
  GREY: { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-400', dot: 'bg-slate-500' },
}

export default function RagStatus({ status, label, size = 'md' }: RagStatusProps) {
  const c = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 ${size === 'sm' ? 'py-0.5' : 'py-1'} ${c.bg} ${c.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`${size === 'sm' ? 'text-xs' : 'text-xs'} font-semibold ${c.text}`}>
        {label ?? status}
      </span>
    </span>
  )
}
