// file: src/components/reports/modificacions/KpiTopCategory.tsx
import { KpiCard } from './KpiCard'
import type { ModificationSummary } from './types'

export function KpiTopCategory({ summary }: { summary: ModificationSummary | null }) {
  const top = summary?.topCategory
  const subtitle = top ? `${top.count} modificacions` : 'Sense dades'
  return <KpiCard title="Top categoria" value={top?.name || '—'} subtitle={subtitle} />
}
