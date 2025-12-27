// file: src/components/reports/incidencies/KpiTopEvent.tsx
import { KpiCard } from './KpiCard'
import type { IncidentSummary } from './types'

export function KpiTopEvent({ summary }: { summary: IncidentSummary | null }) {
  const top = summary?.topEvent
  const subtitle = top ? `${top.count} incidències` : 'Sense dades'
  return <KpiCard title="Top esdeveniment" value={top?.name || '—'} subtitle={subtitle} />
}
