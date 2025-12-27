// file: src/components/reports/incidencies/KpiOpen.tsx
import { KpiCard } from './KpiCard'

export function KpiOpen({ open, total }: { open: number; total: number }) {
  const subtitle = total ? `${Math.round((open / total) * 100)}% obertes` : 'Sense dades'
  return <KpiCard title="Obertes" value={open} subtitle={subtitle} />
}
