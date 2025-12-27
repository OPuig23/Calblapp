import { Summary } from './types'
import KpiCard from './KpiCard'

type Props = { summary: Summary | null }

export default function KpiHoursTheoretical({ summary }: Props) {
  const value = '—'
  const footer =
    summary && summary.people
      ? 'Afegir hores contractades (maxHoursWeek) per calcular-ho'
      : 'Sense dades'

  return <KpiCard title="Hores teòriques / contractades" value={value} footer={footer} />
}
