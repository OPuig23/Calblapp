// file: src/components/reports/events/KpiAvgPax.tsx
import { KpiCard } from './KpiCard'

export function KpiAvgPax({ avg }: { avg: number }) {
  return <KpiCard title="Pax mitjana per event" value={`${avg.toFixed(1)} pax`} />
}
