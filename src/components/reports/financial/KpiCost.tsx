// file: src/components/reports/financial/KpiCost.tsx
import { KpiCard } from './KpiCard'

export function KpiCost({ value }: { value: number }) {
  return <KpiCard title="Cost laboral" value={`${value.toFixed(0)} €`} />
}
