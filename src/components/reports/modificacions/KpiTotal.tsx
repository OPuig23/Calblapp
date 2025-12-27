// file: src/components/reports/modificacions/KpiTotal.tsx
import { KpiCard } from './KpiCard'

export function KpiTotal({ value }: { value: number }) {
  return <KpiCard title="Modificacions" value={value} />
}
