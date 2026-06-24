'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>
  size?: number
  innerRadius?: number
  outerRadius?: number
}

export default function DonutChart({ data, size = 180, innerRadius = 55, outerRadius = 75 }: DonutChartProps) {
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }}
          formatter={(value: number, name: string) => [value, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
