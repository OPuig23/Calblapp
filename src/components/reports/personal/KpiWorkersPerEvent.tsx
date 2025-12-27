import { Summary } from './types'
import KpiCard from './KpiCard'

type Props = { summary: Summary | null }

export default function KpiWorkersPerEvent({ summary }: Props) {
  const value =
    summary && summary.events > 0 ? (summary.people / summary.events).toFixed(2) : '—'
  const footer =
    summary && summary.events > 0
      ? `${summary.people} persones / ${summary.events} events`
      : 'Sense dades en el rang'

  return <KpiCard title="Treballadors únics per event" value={value} footer={footer} />
}
