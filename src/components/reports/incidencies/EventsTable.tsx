// file: src/components/reports/incidencies/EventsTable.tsx
import type { IncidentRow } from './types'

export function EventsTable({ data }: { data: IncidentRow[] }) {
  const agg = new Map<string, { name: string; count: number; department: string }>()
  data.forEach(i => {
    const key = i.eventId || i.eventCode || i.eventTitle
    if (!key) return
    const current = agg.get(key) || { name: i.eventTitle || i.eventCode || key, count: 0, department: i.department || '' }
    current.count += 1
    current.department = current.department || i.department
    agg.set(key, current)
  })
  const rows = Array.from(agg.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-3 border-b">
        <p className="font-semibold text-gray-800">Incidències per esdeveniment</p>
      </div>

      <div className="md:hidden space-y-3 p-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-500 text-sm border rounded-lg py-3">Sense dades en el rang seleccionat.</div>
        )}
        {rows.map(row => (
          <div key={row.id} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold text-gray-800">{row.name}</div>
            <div className="text-gray-600">{row.department || '—'}</div>
            <div className="flex justify-between text-gray-600 mt-1">
              <span>Incidències</span>
              <span>{row.count}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Esdeveniment</th>
              <th className="px-4 py-2 text-left">Departament</th>
              <th className="px-4 py-2 text-right">Incidències</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.department || '—'}</td>
                <td className="px-4 py-2 text-right">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
