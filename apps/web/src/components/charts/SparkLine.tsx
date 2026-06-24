'use client'

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface SparkLineProps {
  data: number[]
  color?: string
  height?: number
}

export default function SparkLine({ data, color = '#4F46E5', height = 48 }: SparkLineProps) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
        <Tooltip
          contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }}
          labelFormatter={() => ''}
          formatter={(value: number) => [value, 'Velocity']}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
