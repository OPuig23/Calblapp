// /src/components/reports/BarChart.tsx
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function BarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReBarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="hours" />
      </ReBarChart>
    </ResponsiveContainer>
  )
}
