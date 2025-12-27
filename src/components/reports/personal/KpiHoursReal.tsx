import { Summary } from './types'
import KpiCard from './KpiCard'

type Props = { summary: Summary | null }

export default function KpiHoursReal({ summary }: Props) {
  const value = summary ? `${summary.hours.toFixed(1)} h` : '—'
  return <KpiCard title="Hores reals" value={value} footer="Hores sumades de torns (rang filtrat)" />
}
