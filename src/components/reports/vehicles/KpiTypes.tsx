// file: src/components/reports/vehicles/KpiTypes.tsx
import { KpiCard } from './KpiCard'

export function KpiTypes({ types }: { types: string[] }) {
  const label = types.length ? types.slice(0, 2).join(', ') + (types.length > 2 ? '…' : '') : 'Sense dades'
  return <KpiCard title="Tipus de vehicle" value={types.length} subtitle={label} />
}
