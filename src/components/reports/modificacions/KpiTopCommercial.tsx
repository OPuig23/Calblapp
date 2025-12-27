// file: src/components/reports/modificacions/KpiTopCommercial.tsx
import { KpiCard } from './KpiCard'
import type { ModificationSummary } from './types'

export function KpiTopCommercial({ summary }: { summary: ModificationSummary | null }) {
  const top = summary?.topCommercial
  const subtitle = top ? `${top.count} modificacions` : 'Sense dades'
  return <KpiCard title="Top comercial" value={top?.name || '—'} subtitle={subtitle} />
}
