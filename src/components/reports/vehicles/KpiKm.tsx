// file: src/components/reports/vehicles/KpiKm.tsx
import { KpiCard } from './KpiCard'

export function KpiKm({ value }: { value: number }) {
  return <KpiCard title="Km estimats" value={`${value.toFixed(1)} km`} />
}
