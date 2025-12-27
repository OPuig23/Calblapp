// file: src/components/reports/incidencies/KpiTotal.tsx
import { KpiCard } from './KpiCard'

export function KpiTotal({ total }: { total: number }) {
  return <KpiCard title="Incidències" value={total} />
}
