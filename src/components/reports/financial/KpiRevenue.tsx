// file: src/components/reports/financial/KpiRevenue.tsx
import { KpiCard } from './KpiCard'

export function KpiRevenue({ value }: { value: number }) {
  return <KpiCard title="Ingressos" value={`${value.toFixed(0)} €`} />
}
