// file: src/components/reports/vehicles/KpiVehicles.tsx
import { KpiCard } from './KpiCard'

export function KpiVehicles({ count }: { count: number }) {
  return <KpiCard title="Vehicles únics" value={count} />
}
