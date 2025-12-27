// file: src/components/reports/events/KpiTopCommercial.tsx
import { KpiCard } from './KpiCard'
import type { EventSummary } from './types'

export function KpiTopCommercial({ summary }: { summary: EventSummary | null }) {
  const top = summary?.topCommercial
  const subtitle = top ? `${top.events} events` : 'Sense dades'
  return <KpiCard title="Top comercial" value={top?.name || '—'} subtitle={subtitle} />
}
