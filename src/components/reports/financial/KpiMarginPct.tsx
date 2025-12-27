// file: src/components/reports/financial/KpiMarginPct.tsx
import { KpiCard } from './KpiCard'

export function KpiMarginPct({ value }: { value: number }) {
  return <KpiCard title="Marge %" value={`${value.toFixed(1)} %`} />
}
