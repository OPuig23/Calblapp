// file: src/components/reports/events/CommercialsTable.tsx
import type { EventRow } from './types'

type Row = {
  commercial: string
  events: number
  paxTotal: number
  paxAvg: number
}

export function CommercialsTable({ data }: { data: EventRow[] }) {
  const agg = new Map<string, { events: number; paxTotal: number }>()
  data.forEach(ev => {
    const key = ev.commercial || 'Sense comercial'
    const current = agg.get(key) || { events: 0, paxTotal: 0 }
    current.events += 1
    current.paxTotal += Number(ev.pax || 0)
    agg.set(key, current)
  })

  const rows: Row[] = Array.from(agg.entries())
    .map(([commercial, v]) => ({ commercial, events: v.events, paxTotal: v.paxTotal, paxAvg: v.events ? v.paxTotal / v.events : 0 }))
    .sort((a, b) => b.events - a.events)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Events per comercial</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Comercial</th>
              <th className="px-4 py-2 text-right">Events</th>
              <th className="px-4 py-2 text-right">Pax total</th>
              <th className="px-4 py-2 text-right">Pax mitjà</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={row.commercial} className="border-t">
                <td className="px-4 py-2">{row.commercial}</td>
                <td className="px-4 py-2 text-right">{row.events}</td>
                <td className="px-4 py-2 text-right">{row.paxTotal}</td>
                <td className="px-4 py-2 text-right">{row.paxAvg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
