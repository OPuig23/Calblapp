// file: src/components/reports/modificacions/EventsTable.tsx
import type { ModificationRow } from './types'

export function EventsTable({ data }: { data: ModificationRow[] }) {
  const agg = new Map<
    string,
    { name: string; total: number; last72: number; commercial: string; department: string }
  >()
  data.forEach(m => {
    const key = m.eventId || m.eventCode || m.eventTitle
    if (!key) return
    const current =
      agg.get(key) || {
        name: m.eventTitle || m.eventCode || key,
        total: 0,
        last72: 0,
        commercial: m.eventCommercial || '',
        department: m.department || '',
      }
    current.total += 1
    if (m.last72h) current.last72 += 1
    current.department = current.department || m.department
    current.commercial = current.commercial || m.eventCommercial
    agg.set(key, current)
  })

  const rows = Array.from(agg.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Modificacions per esdeveniment</p>
      </div>

      <div className="md:hidden space-y-3 p-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-3">Sense dades en el rang seleccionat.</div>
        )}
        {rows.map(row => (
          <div key={row.id} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800">{row.name}</div>
            <div className="text-gray-600">
              {row.department || '—'} {row.commercial ? `· ${row.commercial}` : ''}
            </div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Total</span>
              <span>{row.total}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>&lt;72h</span>
              <span>{row.last72}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Esdeveniment</th>
              <th className="px-4 py-2 text-left">Dept</th>
              <th className="px-4 py-2 text-left">Comercial</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">&lt;72h</th>
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
                <td className="px-4 py-2">{row.department || '—'}</td>
                <td className="px-4 py-2">{row.commercial || '—'}</td>
                <td className="px-4 py-2 text-right">{row.total}</td>
                <td className="px-4 py-2 text-right">{row.last72}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
