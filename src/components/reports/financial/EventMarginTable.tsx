// file: src/components/reports/financial/EventMarginTable.tsx
import type { FinancialEvent } from './types'

type Row = {
  id: string
  name: string
  revenue: number
  cost: number
  margin: number
  marginPct: number
}

export function EventMarginTable({ data, costPerHour }: { data: FinancialEvent[]; costPerHour: number }) {
  const rows: Row[] = data
    .map(ev => {
      const revenue = Number(ev.importTotal || 0)
      const cost = Number(ev.hours || 0) * costPerHour
      const margin = revenue - cost
      const marginPct = revenue ? (margin / revenue) * 100 : 0
      return {
        id: ev.id,
        name: ev.name || ev.id,
        revenue,
        cost,
        margin,
        marginPct,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Ranking events (marge)</p>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-3">Sense dades en el rang seleccionat.</div>
        )}
        {rows.map(row => (
          <div key={row.id} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800">{row.name}</div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Ingressos</span>
              <span>{row.revenue.toFixed(0)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Cost</span>
              <span>{row.cost.toFixed(0)} €</span>
            </div>
            <div className="flex justify-between text-gray-800 font-semibold">
              <span>Marge</span>
              <span>
                {row.margin.toFixed(0)} € ({row.marginPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Event</th>
              <th className="px-4 py-2 text-right">Ingressos</th>
              <th className="px-4 py-2 text-right">Cost</th>
              <th className="px-4 py-2 text-right">Marge</th>
              <th className="px-4 py-2 text-right">Marge %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right">{row.revenue.toFixed(0)} €</td>
                <td className="px-4 py-2 text-right">{row.cost.toFixed(0)} €</td>
                <td className="px-4 py-2 text-right">{row.margin.toFixed(0)} €</td>
                <td className="px-4 py-2 text-right">{row.marginPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
