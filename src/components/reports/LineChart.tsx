// src/components/reports/LineChart.tsx
'use client'

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts'

interface Props {
  data?: { name: string; value: number }[]
}

export function LineChart({ data = [] }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ReLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} />
      </ReLineChart>
    </ResponsiveContainer>
  )
}
