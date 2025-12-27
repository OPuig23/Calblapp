import type { Summary } from './types'

type Row = {
  id: string
  name: string
  department: string
  hours: number
  events: number
  roles: Summary['roles']
}

export default function TopHoursTable({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Top per hores treballades</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Nom</th>
              <th className="py-2 pr-4">Dept</th>
              <th className="py-2 pr-4">Hores</th>
              <th className="py-2 pr-4">Events</th>
              <th className="py-2 pr-4">Resp</th>
              <th className="py-2 pr-4">Cond</th>
              <th className="py-2 pr-4">Treball</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="py-2 pr-4">{row.name}</td>
                <td className="py-2 pr-4 capitalize">{row.department}</td>
                <td className="py-2 pr-4 font-semibold">{row.hours.toFixed(1)}</td>
                <td className="py-2 pr-4">{row.events}</td>
                <td className="py-2 pr-4">{row.roles.responsable}</td>
                <td className="py-2 pr-4">{row.roles.conductor}</td>
                <td className="py-2 pr-4">{row.roles.treballador}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-center text-gray-500">
                  Sense dades en el rang seleccionat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
