// file: src/components/reports/events/KpiLnShare.tsx
import { KpiCard } from './KpiCard'
import type { EventSummary } from './types'

export function KpiLnShare({ summary }: { summary: EventSummary | null }) {
  const total = summary?.totalEvents || 0
  const top = (summary?.lnShare || []).slice(0, 2)
  const subtitle =
    total > 0 && top.length
      ? top.map(i => `${i.ln || 'Sense LN'} ${Math.round((i.count / total) * 100)}%`).join(' · ')
      : 'Sense dades'

  return <KpiCard title="Events per LN" value={total > 0 ? `${top.length} LN` : '0'} subtitle={subtitle} />
}
