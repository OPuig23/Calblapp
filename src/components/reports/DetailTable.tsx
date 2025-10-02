// file: src/components/reports/DetailTable.tsx
'use client'

interface Row {
  id:               string
  name:             string
  department:       string
  role:             string
  hoursWorked:      number
  extraHours:       number
  responsableCount: number
  eventsCount:      number
}

export function DetailTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto bg-white shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Nom</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Dept.</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Rol</th>
            <th className="px-4 py-2 text-right font-medium text-gray-700">Hores</th>
            <th className="px-4 py-2 text-right font-medium text-gray-700">Extres</th>
            <th className="px-4 py-2 text-right font-medium text-gray-700">#Resp</th>
            <th className="px-4 py-2 text-right font-medium text-gray-700">#Events</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2">{r.department}</td>
              <td className="px-4 py-2">{r.role}</td>
              <td className="px-4 py-2 text-right">{r.hoursWorked.toFixed(1)}</td>
              <td className="px-4 py-2 text-right">{r.extraHours}</td>
              <td className="px-4 py-2 text-right">{r.responsableCount}</td>
              <td className="px-4 py-2 text-right">{r.eventsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
