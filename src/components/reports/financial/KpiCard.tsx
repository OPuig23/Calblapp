// file: src/components/reports/financial/KpiCard.tsx
type Props = {
  title: string
  value: string | number
  subtitle?: string
}

export function KpiCard({ title, value, subtitle }: Props) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
