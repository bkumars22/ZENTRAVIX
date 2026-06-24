interface HealthScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

function getLabel(score: number): string {
  if (score >= 80) return 'GREEN'
  if (score >= 60) return 'AMBER'
  return 'RED'
}

export default function HealthScore({ score, size = 'md' }: HealthScoreProps) {
  const color = getColor(score)
  const label = getLabel(score)

  const radius = size === 'sm' ? 20 : size === 'lg' ? 36 : 28
  const strokeWidth = size === 'sm' ? 4 : 5
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const svgSize = (radius + strokeWidth) * 2
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <span className={`${textSize} font-bold`} style={{ color }}>
        {score}
      </span>
      {size !== 'sm' && (
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  )
}
