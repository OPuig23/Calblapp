// file: src/components/reports/incidencies/KpiTopCategory.tsx
import { KpiCard } from './KpiCard'
import type { IncidentSummary } from './types'

export function KpiTopCategory({ summary }: { summary: IncidentSummary | null }) {
  const top = summary?.topCategory
  const subtitle = top ? `${top.count} incidències` : 'Sense dades'
  return <KpiCard title="Top categoria" value={top?.name || '—'} subtitle={subtitle} />
}
