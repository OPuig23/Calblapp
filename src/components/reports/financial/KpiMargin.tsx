// file: src/components/reports/financial/KpiMargin.tsx
import { KpiCard } from './KpiCard'

export function KpiMargin({ value }: { value: number }) {
  return <KpiCard title="Marge" value={`${value.toFixed(0)} €`} />
}
