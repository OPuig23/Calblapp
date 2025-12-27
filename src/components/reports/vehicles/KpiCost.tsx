// file: src/components/reports/vehicles/KpiCost.tsx
import { KpiCard } from './KpiCard'

export function KpiCost({ value }: { value: number }) {
  return <KpiCard title="Cost estimat" value={`${value.toFixed(2)} €`} />
}
