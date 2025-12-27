// file: src/components/reports/modificacions/KpiLast72.tsx
import { KpiCard } from './KpiCard'

export function KpiLast72({ value, total }: { value: number; total: number }) {
  const subtitle = total ? `${Math.round((value / total) * 100)}% en <72h` : 'Sense dades'
  return <KpiCard title="< 72 hores" value={value} subtitle={subtitle} />
}
