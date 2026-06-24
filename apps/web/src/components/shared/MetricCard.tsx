interface MetricCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'green' | 'amber' | 'red' | 'blue'
}

const colorMap = {
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-brand-400',
}

const trendArrow = {
  up: '+ ',
  down: '- ',
  neutral: '',
}

const trendColor = {
  up: 'text-green-400',
  down: 'text-red-400',
  neutral: 'text-slate-400',
}

export default function MetricCard({ label, value, subValue, trend, trendValue, color }: MetricCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${color ? colorMap[color] : 'text-white'}`}>
        {value}
      </div>
      {(subValue || trendValue) && (
        <div className="flex items-center gap-2 mt-1">
          {subValue && <span className="text-slate-400 text-xs">{subValue}</span>}
          {trend && trendValue && (
            <span className={`text-xs font-medium ${trendColor[trend]}`}>
              {trendArrow[trend]}{trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
