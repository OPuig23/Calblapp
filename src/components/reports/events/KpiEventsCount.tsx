// file: src/components/reports/events/KpiEventsCount.tsx
import { KpiCard } from './KpiCard'

export function KpiEventsCount({ total }: { total: number }) {
  return <KpiCard title="Nº d'esdeveniments" value={total ?? 0} />
}
